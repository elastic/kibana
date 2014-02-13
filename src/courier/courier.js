define(function (require) {

  var DataSource = require('courier/data_source');
  var Docs = require('courier/docs');
  var EventEmitter = require('utils/event_emitter');
  var inherits = require('utils/inherits');
  var errors = require('courier/errors');
  var _ = require('lodash');
  var angular = require('angular');

  function chain(cntx, method) {
    return function () {
      method.apply(cntx, arguments);
      return this;
    };
  }

  function emitError(source, courier, error) {
    if (EventEmitter.listenerCount(source, 'error')) {
      source.emit('error', error);
    } else {
      courier.emit('error', error);
    }
  }

  function mergeProp(state, filters, val, key) {
    switch (key) {
    case 'inherits':
    case '_type':
      // ignore
      return;
    case 'filter':
      filters.push(val);
      return;
    case 'index':
    case 'type':
      if (key && state[key] == null) {
        state[key] = val;
      }
      return;
    case 'source':
      key = '_source';
      /* fall through */
    }

    if (key && state.body[key] == null) {
      state.body[key] = val;
    }
  }

  function flattenDataSource(source) {
    var state = {
      body: {}
    };

    // all of the filters from the source chain
    var filters = [];
    var collectProp = _.partial(mergeProp, state, filters);

    // walk the chain and merge each property
    var current = source;
    var currentState;
    while (current) {
      currentState = current._state();
      _.forOwn(currentState, collectProp);
      current = currentState.inherits;
    }

    // defaults for the query
    _.forOwn({
      query: {
        'match_all': {}
      }
    }, collectProp);

    // switch to filtered query if there are filters
    if (filters.length) {
      state.body.query = {
        filtered: {
          query: state.body.query,
          filter: {
            bool: {
              must: filters
            }
          }
        }
      };
    }

    return state;
  }

  function fetchSearchResults(courier, client, sources, cb) {
    if (!client) {
      this.emit('error', new Error('Courier does not have a client yet, unable to fetch queries.'));
      return;
    }

    var all = [];
    var body = '';
    _.each(sources, function (source) {
      if (source.getType() !== 'search') {
        return;
      }
      all.push(source);

      var state = flattenDataSource(source);
      var header = JSON.stringify({
        index: state.index,
        type: state.type
      });
      var doc = JSON.stringify(state.body);

      body += header + '\n' + doc + '\n';
    });

    return client.msearch({ body: body }, function (err, resp) {
      if (err) return cb(err);

      _.each(resp.responses, function (resp, i) {
        var source = sources[i];
        if (resp.error) return emitError(source, courier, resp);
        source.emit('results', resp);
      });

      cb(err, resp);
    });
  }

  function fetchDocs(courier, client, sources, cb) {
    if (!client) {
      this.emit('error', new Error('Courier does not have a client yet, unable to fetch queries.'));
      return;
    }

    var all = [];
    var body = {
      docs: []
    };

    _.each(sources, function (source) {
      if (source.getType() !== 'get') {
        return;
      }

      all.push(source);

      var state = flattenDataSource(source);
      body.docs.push({
        index: state.index,
        type: state.type,
        id: state.id
      });
    });

    return client.mget({ body: body }, function (err, resp) {
      if (err) return cb(err);

      _.each(resp.responses, function (resp, i) {
        var source = sources[i];
        if (resp.error) return emitError(source, courier, resp);
        source.emit('results', resp);
      });

      cb(err, resp);
    });
  }

  function saveUpdate(source, fields) {

  }

  /**
   * Federated query service, supports data sources that inherit properties
   * from one another and automatically emit results.
   * @param {object} config
   * @param {Client} config.client - The elasticsearch.js client to use for querying. Should be setup and ready to go.
   * @param {integer} [config.fetchInterval=30000] - The amount in ms between each fetch (deafult is 30 seconds)
   */
  function Courier(config) {
    if (!(this instanceof Courier)) return new Courier(config);
    var opts = {
      fetchInterval: 30000
    };
    var fetchTimer;
    var activeRequest;
    var courier = this;
    var sources = {
      search: [],
      get: []
    };

    function doSearch() {
      if (!opts.client) {
        this.emit('error', new Error('Courier does not have a client, pass it ' +
          'in to the constructor or set it with the .client() method'));
        return;
      }
      if (activeRequest) {
        activeRequest.abort();
        stopFetching();
        this.emit('error', new errors.HastyRefresh());
        return;
      }

      // we need to catch the original promise in order to keep it's abort method
      activeRequest = fetchSearchResults(courier, opts.client, sources.search, function (err, resp) {
        activeRequest = null;
        setFetchTimeout();

        if (err) {
          window.console && console.log(err);
        }
      });
    }

    function setFetchTimeout() {
      clearTimeout(fetchTimer);
      if (opts.fetchInterval) {
        fetchTimer = setTimeout(doSearch, opts.fetchInterval);
      } else {
        fetchTimer = null;
      }
    }

    function stopFetching(type) {
      clearTimeout(fetchTimer);
    }

    // start using a DataSource in fetches/updates
    function openDataSource(source) {
      var type = source.getType();
      if (~sources[type].indexOf(source)) return false;
      sources[type].push(source);
    }

    // stop using a DataSource in fetches/updates
    function closeDataSource(source) {
      var type = source.getType();
      var i = sources[type].indexOf(source);
      if (i === -1) return;
      sources[type].slice(i, 1);
      // only search DataSources get fetched automatically
      if (type === 'search' && sources.search.length === 0) stopFetching();
    }

    // has the courier been started?
    function isRunning() {
      return !!fetchTimer;
    }

    // chainable public api
    this.start = chain(this, doSearch);
    this.running = chain(this, isRunning);
    this.stop = chain(this, stopFetching);
    this.close = chain(this, function () { _(sources.search).each(closeDataSource); });
    this.openDataSource = chain(this, openDataSource);
    this.closeDataSource = chain(this, closeDataSource);

    // setters
    this.client = chain(this, function (client) {
      opts.client = client;
    });
    this.fetchInterval = function (val) {
      opts.fetchInterval = val;
      if (isRunning()) setFetchTimeout();
      return this;
    };

    // factory
    this.createSource = function (type, initialState) {
      return new DataSource(this, type, initialState);
    };

    // apply the passed in config
    _.each(config || {}, function (val, key) {
      if (typeof this[key] !== 'function') throw new TypeError('invalid config "' + key + '"');
      this[key](val);
    }, this);
  }
  inherits(Courier, EventEmitter);

  // private api, exposed for testing
  Courier._flattenDataSource = flattenDataSource;

  return Courier;
});