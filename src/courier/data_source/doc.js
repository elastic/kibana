define(function (require) {
  var DataSource = require('courier/data_source/data_source');
  var inherits = require('utils/inherits');
  var nextTick = require('utils/next_tick');
  var errors = require('courier/errors');
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
    var getBody = {
      docs: []
    };

    _.each(refs, function (ref) {
      var source = ref.source;
      if (source._getType() !== 'doc') return;

      allRefs.push(ref);
      getBody.docs.push(source._flatten());
    });

    return client.mget({ body: getBody })
      .then(function (resp) {
        _.each(resp.docs, function (resp, i) {
          var ref = allRefs[i];
          var source = ref.source;

          if (resp.error) return source._error(new errors.DocFetchFailure(resp));
          if (resp.found) {
            if (ref.version === resp._version) return; // no change
            ref.version = resp._version;
            source._storeVersion(resp._version);
          } else {
            ref.version = void 0;
            source._clearVersion();
          }
          source.emit('results', resp);
        });

        cb(void 0, resp);
      })
      .catch(cb);
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
      /* jshint eqeqeq: false */
      return (!ref.fetchCount || ref.version != storedVersion);
    });
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
    var source = this;
    var courier = this._courier;
    var client = courier._getClient();
    var state = this._state;

    client.update({
      id: state.id,
      type: state.type,
      index: state.index,
      version: source._getVersion(),
      body: {
        doc: fields
      }
    }, function (err, resp) {
      if (err) return cb(err);

      courier._docUpdated(source);
      return cb();
    });
  };

  /**
   * Update the document stored
   * @param  {[type]}   body [description]
   * @param  {Function} cb   [description]
   * @return {[type]}        [description]
   */
  DocSource.prototype.doIndex = function (body, cb) {
    var source = this;
    var courier = this._courier;
    var client = courier._getClient();
    var state = this._state;

    client.index({
      id: state.id,
      type: state.type,
      index: state.index,
      body: body,
      ignore: [409]
    }, function (err, resp) {
      if (err) return cb(err);

      if (resp && resp.status === 409) {
        err = new errors.VersionConflict(resp);
        if (listenerCount(source, 'conflict')) {
          return source.emit('conflict', err);
        } else {
          return cb(err);
        }
      }

      source._storeVersion(resp._version);
      courier._docUpdated(source);
      return cb();
    });
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
    var id = this._versionKey();
    if (version) {
      localStorage.setItem(id, version);
    } else {
      localStorage.removeItem(id);
    }
  };

  /**
   * Clears the stored version for a DocSource
   */
  DocSource.prototype._clearVersion = DocSource.prototype._storeVersion;

  return DocSource;
});