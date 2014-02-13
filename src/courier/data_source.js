define(function (require) {
  var inherits = require('utils/inherits');
  var _ = require('lodash');
  var EventEmitter = require('utils/event_emitter');
  var Mapper = require('courier/mapper');
  var IndexPattern = require('courier/index_pattern');

  // polyfill for older versions of node
  function listenerCount(emitter, event) {
    if (EventEmitter.listenerCount) {
      return EventEmitter.listenerCount(emitter, event);
    } else {
      return this.listeners(event).length;
    }
  }

  var apiMethods = {
    search: [
      'index',
      'type',
      'query',
      'filter',
      'sort',
      'highlight',
      'aggs',
      'from',
      'size',
      'source',
      'inherits'
    ],
    get: [
      'index',
      'type',
      'id',
      'sourceInclude',
      'sourceExclude'
    ]
  };

  function DataSource(courier, type, initialState) {
    var state;

    if (initialState) {
      // state can be serialized as JSON, and passed back in to restore
      if (typeof initialState === 'string') {
        state = JSON.parse(initialState);
      } else {
        state = _.cloneDeep(initialState);
      }
      if (state._type) {
        if (type && type !== state._type) {
          throw new Error('Initial state is not of the type specified for this DataSource');
        } else {
          type = state._type;
        }
      }
    } else {
      state = {};
    }

    type = type || 'search';
    if (!_.has(apiMethods, type)) {
      throw new TypeError('Invalid DataSource type ' + type);
    }
    state._type = type;

    var mapper = new Mapper();

    var onNewListener = _.bind(function (name) {
      // new newListener is emitted before it is added, count will be 0
      if (name !== 'results' || listenerCount(this, 'results') !== 0) return;
      courier.openDataSource(this);
      this.removeListener('newListener', onNewListener);
      this.on('removeListener', onRemoveListener);
    }, this);

    var onRemoveListener = _.bind(function () {
      if (listenerCount(this, 'results') > 0) return;
      courier.closeDataSource(this);
      this.removeListener('removeListener', onRemoveListener);
      this.on('newListener', onNewListener);
    }, this);

    this.on('newListener', onNewListener);

    /**
     * Used to flatten a chain of DataSources
     * @return {object} - simple object containing all of the
     *   sources internal state
     */
    this._state = function () {
      return state;
    };

    // public api
    this.toJSON = function () {
      return _.omit(state, 'inherits');
    };
    this.toString = function () {
      return JSON.stringify(this.toJSON());
    };
    this.getFieldNames = function (cb) {
      mapper.getMapping(state.index, state.type, function (mapping) {
        return _.keys(mapping);
      });
    };
    this.getType = function () {
      return state._type;
    };
    this.extend = function () {
      return courier.createSource(type).inherits(this);
    };

    // get/set internal state values
    apiMethods[type].forEach(function (name) {
      this[name] = function (val) {
        state[name] = val;
        if (name === 'index' && arguments[1]) {
          state.index = new IndexPattern(val, arguments[1]);
        }
        return this;
      };
    }, this);
  }
  inherits(DataSource, EventEmitter);

  return DataSource;
});