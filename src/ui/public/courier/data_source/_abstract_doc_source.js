/**
 * @name AbstractDocSource
 *
 * NOTE: This class is tightly coupled with _doc_send_to_es. Its primary
 * methods (`doUpdate`, `doIndex`, `doCreate`) are all proxies for methods
 * exposed by _doc_send_to_es (`update`, `index`, `create`). These methods are
 * called with AbstractDocSource as the context. When called, they depend on “private”
 * AbstractDocSource methods within their execution.
 */

import _ from 'lodash';

import 'ui/es';
import 'ui/storage';
import { RequestFailure } from 'ui/errors';
import { RequestQueueProvider } from 'ui/courier/_request_queue';
import { FetchProvider } from 'ui/courier/fetch/fetch';

import { AbstractDataSourceProvider } from './_abstract';
import { AbstractDocRequestProvider } from '../fetch/request/_abstract_doc';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function AbstractDocSourceProvider(Private, Promise, es, sessionStorage) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  const SourceAbstract = Private(AbstractDataSourceProvider);
  const DocRequest = Private(AbstractDocRequestProvider);
  const requestQueue = Private(RequestQueueProvider);
  const courierFetch = Private(FetchProvider);

  _.class(AbstractDocSource).inherits(SourceAbstract);
  function AbstractDocSource(initialState, strategy) {
    AbstractDocSource.Super.call(this, initialState, strategy);
  }

  AbstractDocSource.prototype.onUpdate = SourceAbstract.prototype.onResults;
  AbstractDocSource.prototype.onResults = void 0;

  /*****
   * PUBLIC API
   *****/

  AbstractDocSource.prototype._createRequest = function (defer) {
    return new DocRequest(this, defer);
  };

  /**
   * List of methods that is turned into a chainable API in the constructor
   * @type {Array}
   */
  AbstractDocSource.prototype._methods = [
    'index',
    'type',
    'id',
    'sourceInclude',
    'sourceExclude'
  ];

  /**
   * Update the document stored
   * @param {Object} body
   * @param {Object} options
   * @property {Boolean} options.allowTitleConflict
   * @return {Promise<String>}
   */
  AbstractDocSource.prototype.doIndex = function (body, options = {}) {
    const { allowTitleConflict } = options;
    return this._save(body, {
      allowOverwrite: true,
      allowTitleConflict
    });
  };

  /**
  * Create the document, fails if the document already exists
  * @param {Object} body
  * @param {Object} options
  * @property {Boolean} options.allowTitleConflict
  * @return {Promise<String>}
  */
  AbstractDocSource.prototype.doCreate = function (body, options = {}) {
    const { allowTitleConflict } = options;
    return this._save(body, {
      allowOverwrite: false,
      allowTitleConflict
    });
  };


  /*****
   * PRIVATE API
   *****/

  AbstractDocSource.prototype._save = function (body, options) {
    const type = this.get('type');
    const id = this.get('id');
    const { allowTitleConflict, allowOverwrite } = options;

    return savedObjectsClient
      .save(type, id, body, {
        allowTitleConflict,
        allowOverwrite
      })
      .then(resp => {
        this._storeVersion(resp._version);
        this.set('id', resp._id);
        return this._notifyPendingCourierRequests(resp);
      })
      .then(() => this.get('id'))
      .catch(err => {
        throw new RequestFailure(err);
      });
  };

  AbstractDocSource.prototype._notifyPendingCourierRequests = function (resp) {
    // use the key to compair sources
    const key = this._versionKey();

    // clear the queue and filter out the removed items, pushing the
    // unmatched ones back in.
    const respondTo = requestQueue.splice(0).filter(function (req) {
      const isDoc = req.source._getType() === 'doc';
      const keyMatches = isDoc && req.source._versionKey() === key;

      // put some request back into the queue
      if (!keyMatches) {
        requestQueue.push(req);
        return false;
      }

      return true;
    });

    return courierFetch.fakeFetchThese(respondTo, respondTo.map(function () {
      return _.cloneDeep(resp);
    }));
  };

  /**
   * Get the type of this SourceAbstract
   * @return {string} - 'doc'
   */
  AbstractDocSource.prototype._getType = function () {
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
  AbstractDocSource.prototype._mergeProp = function (state, val, key) {
    const flatKey = '_' + key;

    if (val != null && state[flatKey] == null) {
      state[flatKey] = val;
    }
  };

  /**
   * Creates a key based on the doc's index/type/id
   * @return {string}
   */
  AbstractDocSource.prototype._versionKey = function () {
    const state = this._state;

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
  AbstractDocSource.prototype._getVersion = function () {
    if (this._version) return this._version;
    else return this._getStoredVersion();
  };

  /**
   * Fetches the stored version from storage
   * @return {[type]} [description]
   */
  AbstractDocSource.prototype._getStoredVersion = function () {
    const key = this._versionKey();
    if (!key) return;

    const v = sessionStorage.get(key);
    this._version = v ? _.parseInt(v) : void 0;
    return this._version;
  };

  /**
   * Stores the version into storage
   * @param  {number, NaN} version - the current version number, NaN works well forcing a refresh
   * @return {undefined}
   */
  AbstractDocSource.prototype._storeVersion = function (version) {
    if (!version) return this._clearVersion();

    const key = this._versionKey();
    if (!key) return;
    this._version = version;
    sessionStorage.set(key, version);
  };

  /**
   * Clears the stored version for a AbstractDocSource
   */
  AbstractDocSource.prototype._clearVersion = function () {
    const key = this._versionKey();
    if (!key) return;
    sessionStorage.remove(key);
  };

  return AbstractDocSource;
}
