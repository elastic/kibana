define(function (require) {
  var _ = require('lodash');
  var errors = require('errors');

  return function () {
    function validateParent(parent, path) {
      if (_.isUndefined(parent)) return;

      if (!_.isString(path) || path.length <= 0) {
        throw new errors.PersistedStateError('Child PersistedState objects must contain a path');
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
      validateValue(value);
      validateParent(parent, path);

      this._path = (!_.isUndefined(path)) ? [path] : [];
      this._parent = parent || false;
      this.set(value || {});
    }

    PersistedState.prototype.get = function (key, def) {
      return _.cloneDeep(this._get(key, def));
    };

    PersistedState.prototype.set = function (key, value) {
      return _.cloneDeep(this._set(key, value));
    };

    PersistedState.prototype.reset = function () {
      this.set({});
    };

    PersistedState.prototype.remove = function (key) {
      this._state = _.omit(this._state, [key]);
      return this.get();
    };

    PersistedState.prototype.createChild = function (path, value) {
      return new PersistedState(value, path, this._parent || this);
    };

    PersistedState.prototype.destroyChild = function (path) {
      this.remove(path);
    };

    PersistedState.prototype.toJSON = function () {
      return JSON.stringify(this._state);
    };

    PersistedState.prototype._getIndex = function (key) {
      if (_.isUndefined(key)) return this._path;
      return this._path.concat(key);
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