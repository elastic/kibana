define(function (require) {

  var DataSource = require('courier/data_source');
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

  function mergeProp(state, filters, val, key) {
    switch (key) {
    case 'inherits':
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

  function fetch(client, sources, cb) {
    if (!client) {
      this.emit('error', new Error('Courier does not have a client yet, unable to fetch queries.'));
      return;
    }

    var all = [];
    var body = '';
    _.each(sources, function (source) {
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
        sources[i].emit('results', resp);
      });

      cb(err, resp);
    });
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

    var sources = [];

    function doFetch() {
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
      activeRequest = fetch(opts.client, sources, function (err, resp) {
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
        fetchTimer = setTimeout(doFetch, opts.fetchInterval);
      } else {
        fetchTimer = null;
      }
    }

    function stopFetching() {
      clearTimeout(fetchTimer);
    }

    function startFetchingSource(source) {
      var existing = _.find(sources, { source: source });
      if (existing) return false;

      sources.push(source);
    }

    function stopFetchingSource(source) {
      var i = sources.indexOf(source);
      if (i !== -1) {
        sources.slice(i, 1);
      }
      if (sources.length === 0) stopFetching();
    }

    // is there a scheduled request?
    function isStarted() {
      return !!fetchTimer;
    }

    // chainable public api
    this.isStarted = chain(this, isStarted);
    this.start = chain(this, doFetch);
    this.startFetchingSource = chain(this, startFetchingSource);
    this.stop = chain(this, stopFetching);
    this.stopFetchingSource = chain(this, stopFetchingSource);
    this.close = chain(this, function stopFetchingAllSources() {
      _.each(sources, stopFetchingSource);
    });

    // setter
    this.client = chain(this, function (client) {
      opts.client = client;
    });

    // setter/getter
    this.fetchInterval = function (val) {
      opts.fetchInterval = val;
      if (isStarted()) setFetchTimeout();
      return this;
    };

    // factory
    this.createSource = function (state) {
      return new DataSource(this, state);
    };

    // apply the passed in config
    _.each(config || {}, function (val, key) {
      if (typeof this[key] !== 'function') throw new TypeError('invalid config "' + key + '"');
      this[key](val);
    }, this);
  }

  // private api, exposed for testing
  Courier._flattenDataSource = flattenDataSource;
  inherits(Courier, EventEmitter);

  return Courier;
});