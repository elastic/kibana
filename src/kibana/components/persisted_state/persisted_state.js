define(function (require) {
  var _ = require('lodash');
  var errors = require('errors');

  return function () {
    function validateParent(parent, path) {
      if (_.isUndefined(parent)) return;

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

      validateValue(value);
      validateParent(parent, this._path);

      value = value || this._getDefault();

      // copy passed state values and create internal trackers
      this._originalState = _.cloneDeep(value); // passed in, restorable state - NEVER MODIFIED
      this.set(_.cloneDeep(value));
    }

    PersistedState.prototype.get = function (key, def) {
      return _.cloneDeep(this._get(key, def));
    };

    PersistedState.prototype.set = function (key, value) {
      return _.cloneDeep(this._set(key, value));
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
      if (_.isUndefined(key)) key = [];
      return (this._path.concat(key)).join('.');
    };

    PersistedState.prototype._getDefault = function () {
      var def = (this._hasPath()) ? undefined : {};
      return (this._parent ? this.get() : def);
    };

    PersistedState.prototype._setPath = function (path) {
      var isString = _.isString(path);
      var isArray = _.isArray(path);

      if (!isString && !isArray) return [];
      return (isString) ? [path] : path;
    };

    PersistedState.prototype._hasPath = function () {
      return this._path.length > 0;
    };

    PersistedState.prototype._get = function (key, def) {
      if (this._parent) return this._parent._get(this._getIndex(key), key);
      if (!this._hasPath() && _.isUndefined(key)) return this._state;
      return _.get(this._state, this._getIndex(key), def);
    };

    PersistedState.prototype._set = function (key, value) {
      // key must be the value, set the entire state using it
      if (_.isUndefined(value)) {
        // swap the key and value to write to the state
        value = key;
        key = undefined;
      }

      if (this._parent) return this._parent._set(this._getIndex(key), value);
      if (!this._hasPath() && _.isUndefined(key)) return this._state = value;
      return this._state = _.set(this._state || {}, this._getIndex(key), value);
    };

    return PersistedState;
  };
});