define(function (require) {
  var inherits = require('utils/inherits');
  var _ = require('lodash');
  var EventEmitter = require('utils/event_emitter');
  var Mapper = require('courier/mapper');

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

    var onNewListener = _.bind(function (name) {
      // new newListener is emitted before it is added, count will be 0
      if (name !== 'results' || EventEmitter.listenerCount(this, 'results') !== 0) return;
      courier._openDataSource(this);
      this.removeListener('newListener', onNewListener);
      this.on('removeListener', onRemoveListener);
    }, this);

    var onRemoveListener = _.bind(function () {
      if (EventEmitter.listenerCount(this, 'results') > 0) return;
      courier._closeDataSource(this);
      this.removeListener('removeListener', onRemoveListener);
      this.on('newListener', onNewListener);
    }, this);

    this.on('newListener', onNewListener);

    this.extend = function () {
      return courier.createSource(this._getType()).inherits(this);
    };

    this.courier = function (newCourier) {
      courier = this._courier = newCourier;
      return this;
    };

    // get/set internal state values
    this._methods.forEach(function (name) {
      this[name] = function (val) {
        state[name] = val;
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
   * fetch the field names for this DataSource
   * @param  {Function} cb
   * @callback {Error, Array} - calls cb with a possible error or an array of field names
   * @todo
   */
  DataSource.prototype.getFields = function (cb) {
    this._courier._mapper.getFields(this, this._wrapcb(cb));
  };

  /**
   * flatten an object to a simple encodable object
   * @return {[type]} [description]
   */
  DataSource.prototype.toJSON = function () {
    return _.omit(this._state, 'inherits');
  };

  /**
   * Create a string representation of the object
   * @return {[type]} [description]
   */
  DataSource.prototype.toString = function () {
    return JSON.stringify(this.toJSON());
  };

  /**
   * Set the $scope for a datasource, when a datasource is bound
   * to a scope, it's event listeners will be wrapped in a call to that
   * scope's $apply method (safely).
   *
   * This also binds the DataSource to the lifetime of the scope: when the scope
   * is destroyed, the datasource is closed
   *
   * @param  {AngularScope} $scope - the scope where the event emitter "occurs",
   *   helps angular determine where to start checking for changes
   * @return {this} - chainable
   */
  DataSource.prototype.$scope = function ($scope) {
    var courier = this;

    if (courier._$scope) {
      // simply change the scope that callbacks will point to
      courier._$scope = $scope;
      return this;
    }

    courier._$scope = $scope;

    // wrap the 'on' method so that all listeners
    // can be wrapped in calls to $scope.$apply
    var origOn = courier.on;
    courier.on = function (event, listener) {
      var wrapped = courier._wrapcb(listener);
      // set .listener so that it can be removed by
      // .removeListener() using the original function
      wrapped.listener = listener;
      return origOn.call(courier, event, wrapped);
    };

    // make sure the alias is still set
    courier.addListener = courier.on;

    courier.on.restore = function () {
      delete courier._$scope;
      courier.on = courier.addListener = origOn;
    };

    return this;
  };

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
    var currentState;
    while (current) {
      currentState = current._state;
      _.forOwn(currentState, collectProp);
      current = currentState.inherits;
    }

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

  DataSource.prototype._wrapcb = function (cb) {
    var courier = this;
    var wrapped = function () {
      var args = arguments;
      // always use the stored ref so that it can be updated if needed
      var $scope = courier._$scope;

      // don't fall apart if we don't have a scope
      if (!$scope) return cb.apply(courier, args);

      // use angular's $apply or $eval functions for the given scope
      $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
        cb.apply(courier, args);
      });
    };
    return wrapped;
  };

  return DataSource;
});