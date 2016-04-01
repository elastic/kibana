define(function (require) {
  let _ = require('lodash');

  return function DocSourceFactory(Private, Promise, es, sessionStorage) {
    let sendToEs = Private(require('ui/courier/data_source/_doc_send_to_es'));
    let SourceAbstract = Private(require('ui/courier/data_source/_abstract'));
    let DocRequest = Private(require('ui/courier/fetch/request/doc'));
    let docStrategy = Private(require('ui/courier/fetch/strategy/doc'));

    _.class(DocSource).inherits(SourceAbstract);
    function DocSource(initialState) {
      DocSource.Super.call(this, initialState, docStrategy);
    }

    DocSource.prototype.onUpdate = SourceAbstract.prototype.onResults;
    DocSource.prototype.onResults = void 0;

    /*****
     * PUBLIC API
     *****/

    DocSource.prototype._createRequest = function (defer) {
      return new DocRequest(this, defer);
    };

    /**
     * List of methods that is turned into a chainable API in the constructor
     * @type {Array}
     */
    DocSource.prototype._methods = [
      'index',
      'type',
      'id',
      'sourceInclude',
      'sourceExclude'
    ];

    /**
     * Applies a partial update to the document
     * @param  {object} fields - The fields to change and their new values (es doc field)
     * @return {undefined}
     */
    DocSource.prototype.doUpdate = function (fields) {
      if (!this._state.id) return this.doIndex(fields);
      return sendToEs.call(this, 'update', false, { doc: fields });
    };

    /**
     * Update the document stored
     * @param  {[type]}   body [description]
     * @return {[type]}        [description]
     */
    DocSource.prototype.doIndex = function (body) {
      return sendToEs.call(this, 'index', false, body);
    };

    DocSource.prototype.doCreate = function (body) {
      return sendToEs.call(this, 'create', false, body, []);
    };

    /*****
     * PRIVATE API
     *****/

    /**
     * Get the type of this SourceAbstract
     * @return {string} - 'doc'
     */
    DocSource.prototype._getType = function () {
      return 'doc';
    };

    /**
     * Used to merge properties into the state within ._flatten().
     * The state is passed in and modified by the function
     *
     * @param  {object} state - the current merged state
     * @param  {*} val - the value at `key`
     * @param  {*} key - The key of `val`
     * @return {undefined}
     */
    DocSource.prototype._mergeProp = function (state, val, key) {
      key = '_' + key;

      if (val != null && state[key] == null) {
        state[key] = val;
      }
    };

    /**
     * Creates a key based on the doc's index/type/id
     * @return {string}
     */
    DocSource.prototype._versionKey = function () {
      let state = this._state;

      if (!state.index || !state.type || !state.id) return;
      return 'DocVersion:' + (
        [ state.index, state.type, state.id ]
        .map(encodeURIComponent)
        .join('/')
      );
    };

    /**
     * Get the cached version number, not the version that is
     * stored/shared with other tabs
     *
     * @return {number} - the version number, or undefined
     */
    DocSource.prototype._getVersion = function () {
      if (this._version) return this._version;
      else return this._getStoredVersion();
    };

    /**
     * Fetches the stored version from storage
     * @return {[type]} [description]
     */
    DocSource.prototype._getStoredVersion = function () {
      let key = this._versionKey();
      if (!key) return;

      let v = sessionStorage.get(key);
      this._version = v ? _.parseInt(v) : void 0;
      return this._version;
    };

    /**
     * Stores the version into storage
     * @param  {number, NaN} version - the current version number, NaN works well forcing a refresh
     * @return {undefined}
     */
    DocSource.prototype._storeVersion = function (version) {
      if (!version) return this._clearVersion();

      let key = this._versionKey();
      if (!key) return;
      this._version = version;
      sessionStorage.set(key, version);
    };

    /**
     * Clears the stored version for a DocSource
     */
    DocSource.prototype._clearVersion = function () {
      let key = this._versionKey();
      if (!key) return;
      sessionStorage.remove(key);
    };

    return DocSource;
  };
});
