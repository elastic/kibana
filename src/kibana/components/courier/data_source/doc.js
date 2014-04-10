define(function (require) {
  var _ = require('lodash');

  var inherits = require('utils/inherits');

  require('./abstract');

  var module = require('modules').get('kibana/courier');

  module.factory('CouriersDocSource', function (couriersErrors, CouriersSourceAbstract, Promise, es, $injector) {
    var VersionConflict = couriersErrors.VersionConflict;
    var RequestFailure = couriersErrors.RequestFailure;
    var sendToEs = $injector.invoke(require('./_doc_send_to_es'));

    function DocSource(courier, initialState) {
      CouriersSourceAbstract.call(this, courier, initialState);

      // move onResults over to onUpdate, because that makes more sense
      this.onUpdate = this.onResults;
      this.onResults = void 0;

      this._sendToEs = sendToEs;
    }
    inherits(DocSource, CouriersSourceAbstract);

    /*****
     * PUBLIC API
     *****/

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
      return this._sendToEs(this._courier, 'update', false, { doc: fields });
    };

    /**
     * Update the document stored
     * @param  {[type]}   body [description]
     * @return {[type]}        [description]
     */
    DocSource.prototype.doIndex = function (body) {
      return this._sendToEs(this._courier, 'index', true, body);
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
      var state = this._state;

      if (!state.index || !state.type || !state.id) return;
      return 'DocVersion:' + (
        [
          state.index,
          state.type,
          state.id
        ]
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
     * Fetches the stored version from localStorage
     * @return {[type]} [description]
     */
    DocSource.prototype._getStoredVersion = function () {
      var key = this._versionKey();
      if (!key) return;

      var v = localStorage.getItem(key);
      this._version = v ? _.parseInt(v) : void 0;
      return this._version;
    };

    /**
     * Stores the version into localStorage
     * @param  {number, NaN} version - the current version number, NaN works well forcing a refresh
     * @return {undefined}
     */
    DocSource.prototype._storeVersion = function (version) {
      if (!version) return this._clearVersion();

      var key = this._versionKey();
      if (!key) return;
      this._version = version;
      localStorage.setItem(key, version);
    };

    /**
     * Clears the stored version for a DocSource
     */
    DocSource.prototype._clearVersion = function () {
      var key = this._versionKey();
      if (!key) return;
      localStorage.removeItem(key);
    };

    return DocSource;
  });
});