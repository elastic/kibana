define(function (require) {

  var EventEmitter = require('utils/event_emitter');
  var inherits = require('utils/inherits');
  var errors = require('courier/errors');
  var _ = require('lodash');
  var angular = require('angular');

  var DocSource = require('courier/data_source/doc');
  var SearchSource = require('courier/data_source/search');
  var HastyRefresh = require('courier/errors').HastyRefresh;
  var nextTick = require('utils/next_tick');

  var Mapper = require('courier/mapper');

  // map constructors to type keywords
  var sourceTypes = {
    doc: DocSource,
    search: SearchSource
  };

  // fetch process for the two source types
  var onFetch = {
    // execute a search right now
    search: function (courier) {
      if (courier._activeSearchRequest) {
        // ensure that this happens async, otherwise listeners
        // might miss error events
        return nextTick(function () {
          courier._error(new HastyRefresh());
        });
      }

      courier._activeSearchRequest = SearchSource.fetch(
        courier,
        courier._refs.search,
        function (err) {
          if (err) return courier._error(err);
          courier._activeSearchRequest = null;
        });
    },

    // validate that all of the DocSource objects are up to date
    // then fetch the onces that are not
    doc: function (courier) {
      DocSource.validate(courier, courier._refs.doc, function (err, invalid) {
        if (err) return courier._error(err);

        // if all of the docs are up to date we don't need to do anything else
        if (invalid.length === 0) return;

        DocSource.fetch(courier, invalid, function (err) {
          if (err) return courier._error(err);
        });
      });
    }
  };

  // default config values
  var defaults = {
    fetchInterval: 30000,
    docInterval: 1500,
    internalIndex: 'kibana4-int',
    mapperCacheType: 'mappings'
  };

  /**
   * Federated query service, supports two data source types: doc and search.
   *
   *  search:
   *    - inherits filters, and other query properties
   *    - automatically emit results on a set interval
   *
   *  doc:
   *    - tracks doc versions
   *    - emits same results event when the doc is updated
   *    - helps seperate versions of kibana running on the same machine stay in sync
   *    - tracks version and uses it to verify that updates are safe to make
   *    - emits conflict event when that happens
   *
   * @param {object} config
   * @param {Client} config.client - The elasticsearch.js client to use for querying. Should be
   *   setup and ready to go.
   * @param {EsClient} [config.client] - The elasticsearch client that the courier should use
   *   (can be set at a later time with the `.client()` method)
   * @param {integer} [config.fetchInterval=30000] - The amount in ms between each fetch (deafult
   *   is 30 seconds)
   */
  function Courier(config) {
    if (!(this instanceof Courier)) return new Courier(config);

    config = _.defaults(config || {}, defaults);

    this._client = config.client;

    // array's to store references to individual sources of each type
    // wrapped in some metadata
    this._refs = _.transform(sourceTypes, function (refs, fn, type) {
      refs[type] = [];
    });

    // stores all timer ids
    this._timer = {};

    // interval times for each type
    this._interval = {};

    // interval hook/fn for each type
    this._onInterval = {};

    // make the mapper accessable
    this._mapper = new Mapper(this, {
      cacheIndex: config.internalIndex,
      cacheType: config.mapperCacheType
    });

    _.each(sourceTypes, function (fn, type) {
      var courier = this;
      // the name used outside of this module
      var publicName;
      if (type === 'search') {
        publicName = 'fetchInterval';
      } else {
        publicName = type + 'Interval';
      }

      // store the config value passed in for this interval
      this._interval[type] = config[publicName];

      // store a quick "bound" method for triggering
      this._onInterval[type] = function () {
        courier.fetch(type);
        courier._schedule(type);
      };

      // create a public setter for this interval type
      this[publicName] = function (val) {
        courier._interval[type] = val;
        courier._schedule(type);
        return this;
      };
    }, this);
  }
  inherits(Courier, EventEmitter);

  /**
   * PUBLIC API
   */

  // start fetching results on an interval, restart if already started
  Courier.prototype.start = function () {
    if (this.running()) {
      this.stop();
    }

    this._schedule('doc');
    this._schedule('search');
    this.fetch();

    return this;
  };

  // is the courier currently running?
  Courier.prototype.running = function () {
    return !!_.size(this._timer);
  };

  // stop the courier from fetching more results
  Courier.prototype.stop = function () {
    this._clearScheduled('search');
    this._clearScheduled('doc');
  };

  // close the courier, stopping it from refreshing and
  // closing all of the sources
  Courier.prototype.close = function () {
    _.each(sourceTypes, function (fn, type) {
      this._refs[type].forEach(function (ref) {
        this._closeDataSource(ref.source);
      }, this);
    }, this);
  };

  // be default, the courier will throw an error if a fetch
  // occurs before a previous fetch finishes. To prevent this, you
  // should call abort before calling .fetch()
  Courier.prototype.abort = function () {
    if (this._activeSearchRequest) {
      this._activeSearchRequest.abort();
      this._activeSearchRequest = null;
    }
  };

  // force a fetch of all datasources right now, optionally filter by type
  Courier.prototype.fetch = function (onlyType) {
    var courier = this;
    _.forOwn(onFetch, function (fn, type) {
      if (onlyType && onlyType !== type) return;
      fn(courier);
      courier._refs[type].forEach(function (ref) {
        ref.fetchCount ++;
      });
    });
  };

  // data source factory
  Courier.prototype.createSource = function (type, initialState) {
    type = type || 'search';
    if ('function' !== typeof sourceTypes[type]) throw new TypeError(
      'Invalid source type ' + type
    );
    var Constructor = sourceTypes[type];
    return new Constructor(this, initialState);
  };


  /*****
   * PRIVATE API
   *****/

  // handle errors in a standard way. The only errors that should make it here are
  // - issues with msearch/mget syntax
  // - unable to reach ES
  // - HastyRefresh
  Courier.prototype._error = function (err) {
    this.stop();
    return this.emit('error', err);
  };

  // every time a child object (DataSource, Mapper) needs the client, it should
  // call _getClient
  Courier.prototype._getClient = function () {
    if (!this._client) throw new Error('Client is not set on the Courier yet.');
    return this._client;
  };

  // start using a DocSource in fetches/updates
  Courier.prototype._openDataSource = function (source) {
    var refs = this._refs[source._getType()];
    if (!_.find(refs, { source: source })) {
      refs.push({
        source: source,
        fetchCount: 0
      });
    }
  };

  // stop using a DataSource in fetches/updates
  Courier.prototype._closeDataSource = function (source) {
    var type = source._getType();
    var refs = this._refs[type];
    _(refs).where({ source: source }).each(_.partial(_.pull, refs));
    if (refs.length === 0) this._clearScheduled(type);
  };

  // schedule a fetch after fetchInterval
  Courier.prototype._schedule = function (type) {
    this._clearScheduled(type);
    if (this._interval[type]) {
      this._timer[type] = setTimeout(this._onInterval[type], this._interval[type]);
    }
  };

  // properly clear scheduled fetches
  Courier.prototype._clearScheduled = function (type) {
    clearTimeout(this._timer[type]);
    delete this._timer[type];
  };

  // alert the courior that a doc has been updated
  // and that it should update matching docs
  Courier.prototype._docUpdated = function (source) {
    var updated = source._state;

    _.each(this._refs.doc, function (ref) {
      var state = ref.source._state;
      if (
        state.id === updated.id
        && state.type === updated.type
        && state.index === updated.index
      ) {
        delete ref.version;
      }
    });

    this.fetch('doc');
  };

  // get the list of open data source objects
  // primarily for testing purposes
  Courier.prototype._openSources = function (type) {
    if (!type) {
      return _.transform(this._refs, function (open, refs) {
        [].push.apply(open, refs);
      }, []);
    }

    return this._refs[type] || [];
  };

  return Courier;
});