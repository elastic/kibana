define(function (require) {

  var DataSource = require('courier/data_source');
  var _ = require('lodash');
  var angular = require('angular');

  require('courier/data_source');
  require('courier/mapper');

  var module = angular.module('kbn.services.courier', []);

  module.directive('courierTest', function (Courier) {
    var courier = Courier();
  });

  module.factory('Courier', function (es) {
    var optionNames = [
      'fetchInterval',
      'client'
    ];

    var mergeProp = function (state, filters, val, key) {
      switch (key) {
      case 'inherits':
        // ignore
        break;
      case 'filter':
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

    var flattenDataSource = function (source) {
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
        },
        index: '_all',
        type: '_all'
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
    };

    function Courier(config) {
      var opts = {};
      var fetchTimer;
      var activeRequest;

      var sources = [];

      var onFetch = _.bind(function () {
        if (!opts.client) {
          throw new Error('Courier does not have a client yet, unable to fetch queries');
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
          var body = JSON.stringify(state.body);

          body += header + '\n' + body + '\n';
        });

        if (activeRequest) {
          activeRequest.abort();
        }

        activeRequest = opts.client.msearch({
          body: body
        }).then(function (resp) {
          _.each(resp.responses, function (resp, i) {
            sources[i].emit('results', resp);
          });
        }, function (err) {
          console.error(err);
        });
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

      var startFetchingSource = function (source) {
        var existing = _.find(sources, { source: source });
        if (existing) return false;

        sources.push(source);

        return this;
      };

      var stopFetchingSource = function (source) {
        var i = sources.indexOf(source);
        if (i !== -1) {
          sources.slice(i, 1);
        }
        if (sources.length === 0) stopFetching();
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
      this.isStarted = function () {
        return !!fetchTimer;
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
      this._flattenDataSource = flattenDataSource;
      this._getQueryForSource = function (source) {
        var existing = _.find(sources, { source: source });
        if (existing) return existing.req;
      };

      _.each(config || {}, function (val, key) {
        if (typeof this[key] !== 'function') throw new TypeError('invalid config "' + key + '"');
        this[key](val);
      }, this);
    }

    return Courier;
  });
});