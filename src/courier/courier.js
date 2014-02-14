define(function (require) {

  var EventEmitter = require('utils/event_emitter');
  var inherits = require('utils/inherits');
  var errors = require('courier/errors');
  var _ = require('lodash');
  var angular = require('angular');

  var DocSource = require('courier/data_source/doc');
  var SearchSource = require('courier/data_source/search');
  var HastyRefresh = require('courier/errors').HastyRefresh;

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
        return courier._error(new HastyRefresh());
      }
      courier._activeSearchRequest = SearchSource.fetch(
        courier,
        courier._refs.search,
        function (err) {
          if (err) return courier._error(err);
        });
    },

    // validate that all of the DocSource objects are up to date
    // then fetch the onces that are not
    doc: function (courier) {
      DocSource.validate(courier, courier._refs.doc, function (err, invalid) {
        if (err) {
          courier.stop();
          return courier.emit('error', err);
        }

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
    docInterval: 2500
  };

  /**
   * Federated query service, supports two data source types: doc and search.
   *
   *  search:
   *    - inherits filters, and other query properties
   *    - automatically emit results on a set interval
   *  doc:
   *    - tracks doc versions
   *    - emits same results event when the doc is updated
   *    - helps seperate versions of kibana running on the same machine stay in sync
   *    - (NI) tracks version and uses it when new versions of a doc are reindexed
   *    - (NI) helps deal with conflicts
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
        onFetch[type](courier);
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

  // start fetching results on an interval
  Courier.prototype.start = function () {
    if (!this.running()) {
      this._schedule('doc');
      this._schedule('search');
      this.fetch();
    }
    return this;
  };

  // is the courier currently running?
  Courier.prototype.running = function () {
    return !!this._fetchTimer;
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

  // force a fetch of all datasources right now
  Courier.prototype.fetch = function () {
    _.forOwn(onFetch, function (method, type) {
      method(this);
    }, this);
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
        source: source
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
    this._timer[type] = clearTimeout(this._timer[type]);
  };

  // alert the courior that a doc has been updated
  // and that it should update matching docs
  Courier.prototype._docUpdated = function (source) {
    var updated = source._state;

    _.each(this._refs.doc, function (ref) {
      var state = ref.source._state;
      if (
        state === updated
        || (
          state.id === updated.id
          && state.type === updated.type
          && state.index === updated.index
        )
      ) {
        delete ref.version;
      }
    });

    onFetch.doc(this);
  };

  return Courier;
});