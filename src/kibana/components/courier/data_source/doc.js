define(function (require) {
  var _ = require('lodash');

  var inherits = require('utils/inherits');
  var listenerCount = require('utils/event_emitter').listenerCount;

  require('./abstract');

  var module = require('modules').get('kibana/courier');

  module.factory('CouriersDocSource', function (couriersErrors, CouriersSourceAbstract, Promise) {
    var VersionConflict = couriersErrors.VersionConflict;
    var RequestFailure = couriersErrors.RequestFailure;

    function DocSource(courier, initialState) {
      CouriersSourceAbstract.call(this, courier, initialState);

      // move onResults over to onUpdate, because that makes more sense
      this.onUpdate = this.onResults;
      this.onResults = void 0;
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
      return this._sendToEs('update', true, { doc: fields });
    };

    /**
     * Update the document stored
     * @param  {[type]}   body [description]
     * @return {[type]}        [description]
     */
    DocSource.prototype.doIndex = function (body) {
      return this._sendToEs('index', false, body);
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
      var v = localStorage.getItem(this._versionKey());
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

      var id = this._versionKey();
      localStorage.setItem(id, version);
    };

    /**
     * Clears the stored version for a DocSource
     */
    DocSource.prototype._clearVersion = function () {
      var id = this._versionKey();
      localStorage.removeItem(id);
    };

    /**
     * Backend for doUpdate and doIndex
     * @param  {String} method - the client method to call
     * @param  {Boolean} validateVersion - should our knowledge
     *   of the the docs current version be sent to es?
     * @param  {String} body - HTTP request body
     */
    DocSource.prototype._sendToEs = function (method, validateVersion, body) {
      var source = this;
      var courier = this._courier;
      var client = courier._getClient();

      // straight assignment will causes undefined values
      var params = _.pick(this._state, ['id', 'type', 'index']);
      params.body = body;
      params.ignore = [409];

      if (validateVersion) {
        params.version = source._getVersion();
      }

      return client[method](params)
      .then(function (resp) {
        if (resp.status === 409) throw new VersionConflict(resp);

        source._storeVersion(resp._version);
        courier._docUpdated(source);
        return resp._id;
      })
      .catch(function (err) {
        // cast the error
        return new RequestFailure(err);
      });
    };

    return DocSource;
  });
});