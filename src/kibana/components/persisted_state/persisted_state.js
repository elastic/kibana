define(function (require) {
  var _ = require('lodash');
  var errors = require('errors');

  return function () {
    function validateParent(parent, path) {
      if (path.length <= 0) {
        throw new errors.PersistedStateError('PersistedState child objects must contain a path');
      }

      if (parent instanceof PersistedState) return;
      throw new errors.PersistedStateError('Parent object must be an instance of PersistedState');
    }

    function validateValue(value) {
      var msg = 'State value must be a plain object';
      if (!value) return;
      if (!_.isPlainObject(value)) throw new errors.PersistedStateError(msg);
    }

    function PersistedState(value, path, parent) {
      this._path = this._setPath(path);
      this._parent = parent || false;

      if (this._parent) {
        validateParent(this._parent, this._path);
      } else if (!this._path.length) {
        validateValue(value);
      }

      value = value || this._getDefault();

      // copy passed state values and create internal trackers
      this.set(value);
      this._initialized = true; // used to track state changes
    }

    PersistedState.prototype.get = function (key, def) {
      return _.cloneDeep(this._get(key, def));
    };

    PersistedState.prototype.set = function (key, value) {
      // key must be the value, set the entire state using it
      if (_.isUndefined(value) && _.isPlainObject(key)) {
        // swap the key and value to write to the state
        value = key;
        key = undefined;
      }

      // ensure the value being passed in is never mutated
      value = _.cloneDeep(value);

      return this._set(key, value);
    };

    PersistedState.prototype.reset = function (key) {
      this.set(key, undefined);
    };

    PersistedState.prototype.clear = function (key) {
      this.set(key, null);
    };

    PersistedState.prototype.createChild = function (path, value) {
      return new PersistedState(value, this._getIndex(path), this._parent || this);
    };

    PersistedState.prototype.destroyChild = function (path) {
      this.remove(path);
    };

    PersistedState.prototype.save = function () {
      this._saveState(this._changedState);
    };

    PersistedState.prototype.toJSON = function () {
      return this.get();
    };

    PersistedState.prototype.toString = function () {
      return JSON.stringify(this.toJSON());
    };

    PersistedState.prototype.fromString = function (input) {
      return this.set(JSON.parse(input));
    };

    PersistedState.prototype._getIndex = function (key) {
      if (_.isUndefined(key)) return this._path;
      return (this._path || []).concat(_.toPath(key));
    };

    PersistedState.prototype._getDefault = function () {
      var def = (this._hasPath()) ? undefined : {};
      return (this._parent ? this.get() : def);
    };

    PersistedState.prototype._setPath = function (path) {
      var isString = _.isString(path);
      var isArray = _.isArray(path);

      if (!isString && !isArray) return [];
      return (isString) ? [this._getIndex(path)] : path;
    };

    PersistedState.prototype._hasPath = function () {
      return this._path.length > 0;
    };

    PersistedState.prototype._get = function (key, def) {
      // delegate to parent instance
      if (this._parent) return this._parent._get(this._getIndex(key), key);

      // no path and no key, get the whole state
      if (!this._hasPath() && _.isUndefined(key)) {
        return this._mergedState;
      }

      return _.get(this._mergedState, this._getIndex(key), def);
    };

    PersistedState.prototype._set = function (key, value, initialChildState, defaultChildState) {
      // initialState = (!_.isUndefined(initialState)) ? initialState : !this._initialized;
      var self = this;
      var initialState = !this._initialized;
      var keyPath = this._getIndex(key);

      // if this is the initial state value, save value as the default
      if (initialState) {
        this._changedState = {};
        if (!this._hasPath() && _.isUndefined(key)) this._defaultState = value;
        else this._defaultState = _.set({}, keyPath, value);
      }

      // delegate to parent instance, passing child's default value
      if (this._parent) {
        return this._parent._set(keyPath, value, initialState, this._defaultState);
      }

      // everything in here affects only the parent state
      if (!initialState && !initialChildState) {
        // no path and no key, set the whole state
        if (!this._hasPath() && _.isUndefined(key)) {
          this._changedState = value;
        } else {
          // arrays merge by index, not the desired behavior - ensure they are replaced
          if (_.isArray(_.get(this._mergedState, keyPath))) {
            _.set(this._mergedState, keyPath, undefined);
          }
          _.set(this._changedState, keyPath, value);
        }
      }

      var targetObj = this._mergedState || _.cloneDeep(this._defaultState);
      var sourceObj = _.merge({}, defaultChildState, this._changedState);
      var mergeMethod = function (targetValue, sourceValue, mergeKey) {
        // If `mergeMethod` is provided it is invoked to produce the merged values of the destination and
        // source properties. If `mergeMethod` returns `undefined` merging is handled by the method instead
        // handler arguments are (targetValue, sourceValue, key, target, source)
        if (!initialState && !initialChildState && _.isEqual(keyPath, self._getIndex(mergeKey))) {
          return !_.isUndefined(sourceValue) ? sourceValue : targetValue;
        }
      };
      this._mergedState = _.merge(targetObj, sourceObj, mergeMethod);

      return this;
    };

    PersistedState.prototype._saveState = function (state) {
      // TODO: persist the state
    };

    return PersistedState;
  };
});