/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @name SavedObject
 *
 * NOTE: SavedObject seems to track a reference to an object in ES,
 * and surface methods for CRUD functionality (save and delete). This seems
 * similar to how Backbone Models work.
 *
 * This class seems to interface with ES primarily through the es Angular
 * service and the saved object api.
 */

import _ from 'lodash';
import { expandShorthand } from '../../../../plugins/kibana_utils/public';
import { SearchSource } from '../courier';
import { SavedObjectsClientProvider } from './saved_objects_client_provider';
import { i18n } from '@kbn/i18n';
import { serializeSavedObject } from './helpers/serialize_saved_object';
import { hydrateIndexPattern } from './helpers/hydrate_index_pattern';
import { applyEsResp } from './helpers/apply_es_resp';
import { saveSavedObject } from './helpers/save_saved_object';



/**
 * An error message to be used when the user rejects a confirm overwrite.
 * @type {string}
 */
export const OVERWRITE_REJECTED = i18n.translate('common.ui.savedObjects.overwriteRejectedDescription', {
  defaultMessage: 'Overwrite confirmation was rejected',
});

/**
 * An error message to be used when the user rejects a confirm save with duplicate title.
 * @type {string}
 */
export const SAVE_DUPLICATE_REJECTED = i18n.translate(
  'common.ui.savedObjects.saveDuplicateRejectedDescription',
  {
    defaultMessage: 'Save with duplicate title confirmation was rejected',
  }
);



export function SavedObjectProvider(Promise, Private, confirmModalPromise, indexPatterns) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  /**
   * The SavedObject class is a base class for saved objects loaded from the server and
   * provides additional functionality besides loading/saving/deleting/etc.
   *
   * It is overloaded and configured to provide type-aware functionality.
   * To just retrieve the attributes of saved objects, it is recommended to use SavedObjectLoader
   * which returns instances of SimpleSavedObject which don't introduce additional type-specific complexity.
   * @param {*} config
   */
  function SavedObject(config) {
    if (!_.isObject(config)) config = {};

    /************
     * Initialize config vars
     ************/

    // type name for this object, used as the ES-type
    const esType = config.type;

    this.getDisplayName = () => esType;

    // NOTE: this.type (not set in this file, but somewhere else) is the sub type, e.g. 'area' or
    // 'data table', while esType is the more generic type - e.g. 'visualization' or 'saved search'.
    this.getEsType = () => esType;

    /**
     * Flips to true during a save operation, and back to false once the save operation
     * completes.
     * @type {boolean}
     */
    this.isSaving = false;
    this.defaults = config.defaults || {};

    // mapping definition for the fields that this object will expose
    const mapping = expandShorthand(config.mapping);

    const afterESResp = config.afterESResp || _.noop;
    const customInit = config.init || _.noop;
    const extractReferences = config.extractReferences;
    const injectReferences = config.injectReferences;

    // optional search source which this object configures
    this.searchSource = config.searchSource ? new SearchSource() : undefined;

    // the id of the document
    this.id = config.id || void 0;

    // the migration version of the document, should only be set on imports
    this.migrationVersion = config.migrationVersion;

    // Whether to create a copy when the object is saved. This should eventually go away
    // in favor of a better rename/save flow.
    this.copyOnSave = false;

    /**
     * After creation or fetching from ES, ensure that the searchSources index indexPattern
     * is an bonafide IndexPattern object.
     *
     * @return {Promise<IndexPattern | null>}
     */
    this.hydrateIndexPattern = id => {
      return hydrateIndexPattern(
        id,
        this,
        config.clearSavedIndexPattern,
        config.indexPattern,
        indexPatterns
      );
    };

    /**
     * Asynchronously initialize this object - will only run
     * once even if called multiple times.
     *
     * @return {Promise}
     * @resolved {SavedObject}
     */
    this.init = _.once(() => {
      // ensure that the esType is defined
      if (!esType) throw new Error('You must define a type name to use SavedObject objects.');

      return Promise.resolve()
        .then(() => {
          // If there is not id, then there is no document to fetch from elasticsearch
          if (!this.id) {
            // just assign the defaults and be done
            _.assign(this, this.defaults);
            return this.hydrateIndexPattern().then(() => {
              return afterESResp.call(this);
            });
          }

          // fetch the object from ES
          return savedObjectsClient
            .get(esType, this.id)
            .then(resp => {
              // temporary compatability for savedObjectsClient
              return {
                _id: resp.id,
                _type: resp.type,
                _source: _.cloneDeep(resp.attributes),
                references: resp.references,
                found: resp._version ? true : false,
              };
            })
            .then(this.applyESResp)
            .catch(this.applyEsResp);
        })
        .then(() => customInit.call(this))
        .then(() => this);
    });

    this.applyESResp = resp =>
      applyEsResp(
        resp,
        this,
        esType,
        config,
        mapping,
        this.hydrateIndexPattern,
        afterESResp,
        injectReferences,
        Promise
      );

    /**
     * Serialize this object
     * @return {Object}
     */
    this._serialize = () => serializeSavedObject(this, mapping);

    /**
     * Returns true if the object's original title has been changed. New objects return false.
     * @return {boolean}
     */
    this.isTitleChanged = () => {
      return this._source && this._source.title !== this.title;
    };

    this.creationOpts = (opts = {}) => ({
      id: this.id,
      migrationVersion: this.migrationVersion,
      ...opts,
    });

    this.save = (opts) => {
      return saveSavedObject(
        esType,
        this,
        savedObjectsClient,
        confirmModalPromise,
        Promise,
        { ...opts, extractReferences });
    };

    this.destroy = () => {};

    /**
     * Delete this object from Elasticsearch
     * @return {promise}
     */
    this.delete = () => {
      return savedObjectsClient.delete(esType, this.id);
    };
  }

  return SavedObject;
}
