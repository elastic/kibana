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

import DocSendToEsProvider from './_doc_send_to_es';
import AbstractDataSourceProvider from './_abstract';
import DocRequestProvider from '../fetch/request/_abstract_doc';

export default function AbstractDocSourceFactory(Private, Promise, es, sessionStorage) {
  const sendToEs = Private(DocSendToEsProvider);
  const SourceAbstract = Private(AbstractDataSourceProvider);
  const DocRequest = Private(DocRequestProvider);

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
   * Applies a partial update to the document
   * @param  {object} fields - The fields to change and their new values (es doc field)
   * @return {undefined}
   */
  AbstractDocSource.prototype.doUpdate = function (fields) {
    if (!this._state.id) return this.doIndex(fields);
    return sendToEs.call(this, 'update', false, { doc: fields });
  };

  /**
   * Update the document stored
   * @param  {[type]}   body [description]
   * @return {[type]}        [description]
   */
  AbstractDocSource.prototype.doIndex = function (body) {
    return sendToEs.call(this, 'index', false, body);
  };

  AbstractDocSource.prototype.doCreate = function (body) {
    return sendToEs.call(this, 'create', false, body, []);
  };

  /*****
   * PRIVATE API
   *****/

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
