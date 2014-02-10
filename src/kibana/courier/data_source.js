define(function (require) {
  var inherits = require('utils/inherits');
  var _ = require('lodash');
  var EventEmitter = require('utils/event_emitter');
  var Mapper = require('courier/mapper');

  // polyfill for older versions of node
  function listenerCount(emitter, event) {
    if (EventEmitter.listenerCount) {
      return EventEmitter.listenerCount(emitter, event);
    } else {
      return this.listeners(event).length;
    }
  }

  var optionNames = [
    'index',
    'indexPattern',
    'type',
    'query',
    'filter',
    'sort',
    'highlight',
    'aggs',
    'from',
    'size',
    'inherits'
  ];

  function DataSource(courier, initialState) {
    var state;

    if (initialState) {
      // state can be serialized as JSON, and passed back in to restore
      if (typeof initialState === 'string') {
        state = JSON.parse(state);
      } else {
        state = _.cloneDeep(initialState);
      }
    } else {
      state = {};
    }

    var mapper = new Mapper();

    var makeActive = _.bind(function () {
      if (listenerCount(this, 'results') === 0) return;
      courier.startFetchingSource(this);
      this.removeListener('newListener', makeActive);
      this.on('removeListener', makeInactive);
    }, this);

    var makeInactive = _.bind(function () {
      if (listenerCount(this, 'results') > 0) return;
      courier.stopFetchingSource(this);
      this.removeListener('removeListener', makeInactive);
      this.on('newListener', makeActive);
    }, this);

    this.on('newListener', makeActive);

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
      return JSON.stringify(_.omit(state, 'inherits'));
    };

    this.getFieldNames = function (cb) {
      mapper.getMapping(state.index, state.type, function (mapping) {
        return _.keys(mapping);
      });
    };

    // get/set internal state values
    optionNames.forEach(function chainableOptions(name) {
      this[name] = function (val) {
        if (val === void 0) {
          return state[name];
        }
        if (state[name] !== val) {
          state[name] = val;
          this.emit('change', this, name);
        }
        return this;
      };
    }, this);
  }
  inherits(DataSource, EventEmitter);

  return DataSource;
});