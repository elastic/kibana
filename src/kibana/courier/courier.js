define(function (require) {

  var DataSource = require('courier/data_source');
  var _ = require('lodash');

  var optionNames = [
    'fetchInterval',
    'client'
  ];

  function Courier(config) {
    config = config || {};

    var opts = {};
    var fetchTimer;
    var activeRequest;

    var sources = [];

    var mergeInheritance = function (source) {
      var state = {
        body: {}
      };

      // all of the filters from the source chain,
      // no particular order
      var filters = [];

      var mergeProp = function (val, key) {
        switch (key) {
        case 'filters':
          filters.push(val);
          break;
        case 'index':
        case 'type':
          if (key && state[key] == null) {
            state[key] = val;
          }
          break;
        default:
          if (key && state.body[key] == null) {
            state.body[key] = val;
          }
          break;
        }
      };

      // walk the chain and merge each property
      var current = source;
      while (current) {
        _.forOwn(current, mergeProp);
        current = current.inherits;
      }

      _.forOwn({
        query: {
          match_all: {}
        },
        index: '_all',
        type: '_all'
      }, mergeProp);

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
    };

    var writeSourceRequest = function (source) {
      var state = mergeInheritance(source.state());
      return JSON.stringify({
          index: state.index,
          type: state.type
        }) +
        '\n' +
        JSON.stringify(state.body);
    };

    var onSourceUpdate = _.bind(function (source) {
      var existing = _.find(sources, { source: source });
      if (!existing) {
        this.stopFetchingSource(source);
      }
      existing.req = writeSourceRequest(source);
    }, this);

    var setFetchTimeout = function () {
      clearTimeout(fetchTimer);
      if (opts.fetchInterval) {
        fetchTimer = setTimeout(onFetch, opts.fetchInterval);
      } else {
        fetchTimer = null;
      }
    };

    var stopFetching = function () {
      clearTimeout(fetchTimer);
      return this;
    };

    var onFetch = _.bind(function () {
      if (!opts.client) {
        throw new Error('Courier does not have a client yet, unable to fetch queries');
      }

      var requests = _.pluck(sources, 'req');

      activeRequest = opts.client.msearch({
        body: requests
      });
    }, this);

    var startFetchingSource = function (source) {
      var existing = _.find(sources, { source: source });
      if (existing) return false;

      sources.push({
        source: source,
        req: writeSourceRequest(source)
      });
      source.on('change', onSourceUpdate);

      return this;
    };

    var stopFetchingSource = function (source) {
      source.removeListener('change', onSourceUpdate);
      _.remove(sources, { source: source });
      if (sources.length === 0) clearTimeout(fetchTimer);
    };

    // public api
    this.start = setFetchTimeout;
    this.startFetchingSource = startFetchingSource;
    this.stop = stopFetching;
    this.stopFetchingSource = stopFetchingSource;
    this.close = _.partial(_.each, sources, stopFetchingSource);
    this.define = function (state) {
      return new DataSource(this, state);
    };

    // chainable settings/getters for state stuff
    optionNames.forEach(function chainableOptions(name) {
      this[name] = function (val) {
        if (val === void 0) {
          return opts[name];
        }
        opts[name] = val;
        switch (name) {
        case 'fetchInterval':
          if (fetchTimer) setFetchTimeout();
        }
        return this;
      };
    }, this);

    // private api, exposed for testing
    this._state = function () { return opts; };
    this._writeSourceRequest = writeSourceRequest;
  }


  return Courier;
});