define(function (require) {
  var DataSource = require('courier/data_source/data_source');
  var inherits = require('utils/inherits');
  var nextTick = require('utils/next_tick');
  var VersionConflict = require('courier/errors').VersionConflict;
  var FetchFailure = require('courier/errors').FetchFailure;
  var RequestFailure = require('courier/errors').RequestFailure;
  var listenerCount = require('utils/event_emitter').listenerCount;
  var _ = require('lodash');

  function DocSource(courier, initialState) {
    DataSource.call(this, courier, initialState);
  }
  inherits(DocSource, DataSource);

  /**
   * Method used by the Courier to fetch multiple DocSource objects at one time.
   * Those objects come in via the refs array, which is a list of objects containing
   * at least `source` and `version` keys.
   *
   * @param  {Courier} courier - The courier requesting the records
   * @param  {array} refs - The list of refs
   * @param  {Function} cb - Callback
   * @return {undefined}
   */
  DocSource.fetch = function (courier, refs, cb) {
    var client = courier._getClient();
    var allRefs = [];
    var body = {
      docs: []
    };

    refs.forEach(function (ref) {
      var source = ref.source;

      var state = source._flatten();
      if (!state || !state._id) return;

      allRefs.push(ref);
      body.docs.push(state);
    });

    // always callback asynchronously
    if (!allRefs.length) return nextTick(cb);

    return client.mget({ body: body }, function (err, resp) {
      if (err) return cb(err);

      resp.docs.forEach(function (resp, i) {
        var ref = allRefs[i];
        var source = ref.source;

        if (resp.error) return source._error(new FetchFailure(resp));
        if (resp.found) {
          if (ref.version === resp._version) return; // no change
          ref.version = resp._version;
          source._storeVersion(resp._version);
        } else {
          ref.version = void 0;
          source._clearVersion();
        }
        source._previousResult = resp;
        source.emit('results', resp);
      });

      cb(void 0, resp);
    });
  };

  /**
   * Method used to check if a list of refs is
   * @param  {[type]}   courier [description]
   * @param  {[type]}   refs    [description]
   * @param  {Function} cb      [description]
   * @return {[type]}           [description]
   */
  DocSource.validate = function (courier, refs, cb) {
    var invalid = _.filter(refs, function (ref) {
      var storedVersion = ref.source._getVersion();
      if (!storedVersion && ref.version) {
        // stored version was cleared, we need to clear our cached
        delete ref.version;
      }

      /* jshint eqeqeq: false */
      return (!ref.fetchCount || !ref.version || ref.version != storedVersion);
    });
    // callbacks should always be called async
    nextTick(cb, void 0, invalid);
  };

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
   * @param  {Function} cb - Callback to know when the update is complete
   * @return {undefined}
   */
  DocSource.prototype.doUpdate = function (fields, cb) {
    if (!this._state.id) return this.doIndex(fields, cb);
    return this._sendToEs('update', true, { doc: fields }, cb);
  };

  /**
   * Update the document stored
   * @param  {[type]}   body [description]
   * @param  {Function} cb   [description]
   * @return {[type]}        [description]
   */
  DocSource.prototype.doIndex = function (body, cb) {
    return this._sendToEs('index', false, body, cb);
  };

  /*****
   * PRIVATE API
   *****/

  /**
   * Get the type of this DataSource
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
   * Fetches the stored version from localStorage
   * @return {number} - the version number, or NaN
   */
  DocSource.prototype._getVersion = function () {
    var v = localStorage.getItem(this._versionKey());
    return v ? _.parseInt(v) : void 0;
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
   * @param  {Function} cb - callback
   */
  DocSource.prototype._sendToEs = function (method, validateVersion, body, cb) {
    cb = this._wrapcb(cb);

    var source = this;
    var courier = this._courier;
    var client = courier._getClient();

    // straight assignment will causes undefined values
    var params = _.pick(this._state, 'id', 'type', 'index');
    params.body = body;
    params.ignore = [409];

    if (validateVersion) {
      params.version = source._getVersion();
    }

    client[method](params, function (err, resp) {
      if (err) return cb(new RequestFailure(err, resp));

      if (resp && resp.status === 409) {
        err = new VersionConflict(resp);
        if (listenerCount(source, 'conflict')) {
          return source.emit('conflict', err);
        } else {
          return cb(err);
        }
      }

      source._storeVersion(resp._version);
      courier._docUpdated(source);
      if (typeof cb === 'function') return cb(void 0, resp._id);
    });
  };

  return DocSource;
});