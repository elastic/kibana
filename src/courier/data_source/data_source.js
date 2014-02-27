define(function (require) {
  var inherits = require('utils/inherits');
  var _ = require('lodash');
  var EventEmitter = require('utils/event_emitter');
  var Mapper = require('courier/mapper');
  var nextTick = require('utils/next_tick');

  function DataSource(courier, initialState) {
    var state;

    EventEmitter.call(this);

    // state can be serialized as JSON, and passed back in to restore
    if (initialState) {
      if (typeof initialState === 'string') {
        state = JSON.parse(initialState);
      } else {
        state = _.cloneDeep(initialState);
      }
    } else {
      state = {};
    }

    this._state = state;
    this._courier = courier;

    this.on('newListener', function (name, listener) {
      if (name !== 'results') return;

      if (this._previousResult) {
        // always call the listener async, to match normal "emit" behavior
        var result = this._previousResult;
        var self = this;
        nextTick(function () {
          listener.call(self, result);
        });
      }

      // newListener is emitted before the listener is actually is added,
      // so count should be 0 if this is the first
      if (EventEmitter.listenerCount(this, 'results') === 0) {
        courier._openDataSource(this);
      }
    });

    this.on('removeListener', function onRemoveListener() {
      if (EventEmitter.listenerCount(this, 'results') > 0) return;
      courier._closeDataSource(this);
    });

    this.extend = function () {
      return courier
        .createSource(this._getType())
        .inherits(this);
    };

    this.courier = function (newCourier) {
      courier = this._courier = newCourier;
      return this;
    };

    // get/set internal state values
    this._methods.forEach(function (name) {
      this[name] = function (val) {
        if (val == null) {
          delete state[name];
        } else {
          state[name] = val;
        }

        return this;
      };
    }, this);
  }
  inherits(DataSource, EventEmitter);

  /*****
   * PUBLIC API
   *****/

  /**
   * Get values from the state
   * @param {string} name - The name of the property desired
   */
  DataSource.prototype.get = function (name) {
    return this._state[name];
  };

  /**
   * Change the entire state of a DataSource
   * @param {object|string} state - The DataSource's new state, or a
   *   string of the state value to set
   */
  DataSource.prototype.set = function (state, val) {
    if (typeof state === 'string') {
      return this[state](val);
    }

    this._state = state;
    return this;
  };

  /**
   * Clear the disabled flag, you do not need to call this unless you
   * explicitly disabled the DataSource
   */
  DataSource.prototype.enableFetch = function () {
    delete this._fetchDisabled;
    return this;
  };

  /**
   * Disable the DataSource, preventing it or any of it's children from being searched
   */
  DataSource.prototype.disableFetch = function () {
    this._fetchDisabled = true;
    return this;
  };

  /**
   * Attach a scope to this DataSource so that callbacks and event listeners
   * can properly trigger it's $digest cycles
   * @param {AngularScope} $scope
   * @return {this} - chainable
   */
  DataSource.prototype.$scope = function ($scope) {
    this._$scope = $scope;
    return this;
  };

  /**
   * fetch the field names for this DataSource
   * @param  {Function} cb
   * @callback {Error, Array} - calls cb with a possible error or an array of field names
   */
  DataSource.prototype.getFields = function (cb) {
    this._courier._mapper.getFields(this, this._wrapcb(cb));
  };

  /**
   * clear the field list cache
   * @param  {Function} cb
   * @callback {Error, Array} - calls cb with a possible error
   */
  DataSource.prototype.clearFieldCache = function (cb) {
    this._courier._mapper.clearCache(this, this._wrapcb(cb));
  };

  /**
   * return a simple, encodable object representing the state of the DataSource
   * @return {[type]} [description]
   */
  DataSource.prototype.toJSON = function () {
    return _.clone(this._state);
  };

  /**
   * Create a string representation of the object
   * @return {[type]} [description]
   */
  DataSource.prototype.toString = function () {
    return JSON.stringify(this.toJSON());
  };

  /**
   * Custom on method wraps event listeners before
   * adding them so that $digest is properly setup
   *
   * @param {string} event - the name of the event to listen for
   * @param {function} listener - the function to call when the event is emitted
   */
  DataSource.prototype.on = function (event, listener) {
    var wrapped = this._wrapcb(listener);

    // set .listener so that this specific one can
    // be removed by .removeListener()
    wrapped.listener = listener;

    return EventEmitter.prototype.on.call(this, event, wrapped);
  };
  DataSource.prototype.addListener = DataSource.prototype.on;

  /*****
   * PRIVATE API
   *****/

  /**
   * Handle errors by allowing them to bubble from the DataSource
   * to the courior. Maybe we should walk the inheritance chain too.
   * @param  {Error} err - The error that occured
   * @return {undefined}
   */
  DataSource.prototype._error = function (err) {
    if (EventEmitter.listenerCount(this, 'error')) {
      this.emit('error', err);
    } else {
      this._courier._error(err);
    }
  };

  /**
   * Walk the inheritance chain of a source and return it's
   * flat representaion (taking into account merging rules)
   * @return {object} - the flat state of the DataSource
   */
  DataSource.prototype._flatten = function () {
    var type = this._getType();
    // the merged state of this dataSource and it's ancestors
    var flatState = {};

    var collectProp = _.partial(this._mergeProp, flatState);

    // walk the chain and merge each property
    var current = this;
    while (current) {
      // stop processing if this or one of it's parents is disabled
      if (current._fetchDisabled) return;
      // merge the properties from the state into the flattened copy
      _.forOwn(current._state, collectProp);
      // move to this sources parent
      current = current._parent;
    }
    current = null;

    if (type === 'search') {
      // defaults for the query
      _.forOwn({
        query: {
          'match_all': {}
        }
      }, collectProp);

      // switch to filtered query if there are filters
      if (flatState.filters) {
        if (flatState.filters.length) {
          flatState.body.query = {
            filtered: {
              query: flatState.body.query,
              filter: {
                bool: {
                  must: flatState.filters
                }
              }
            }
          };
        }
        delete flatState.filters;
      }
    }

    return flatState;
  };

  /**
   * Wrap a function in $scope.$apply or $scope.$eval for the Source's
   * current $scope
   *
   * @param  {Function} cb - the function to wrap
   * @return {Function} - the wrapped function
   */
  DataSource.prototype._wrapcb = function (cb) {
    var source = this;
    cb = (typeof cb !== 'function') ? _.noop : cb;
    var wrapped = function () {
      var args = arguments;
      // always use the stored ref so that it can be updated if needed
      var $scope = source._$scope;

      // don't fall apart if we don't have a scope
      if (!$scope) return cb.apply(source, args);

      // use angular's $apply or $eval functions for the given scope
      $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
        cb.apply(source, args);
      });
    };
    return wrapped;
  };

  return DataSource;
});