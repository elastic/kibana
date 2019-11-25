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

import _ from 'lodash';
import { PromiseService } from 'ui/promises';
import { SearchSource } from 'ui/courier';
import { hydrateIndexPattern } from 'ui/saved_objects/helpers/hydrate_index_pattern';
import { intializeSavedObject } from 'ui/saved_objects/helpers/initialize_saved_object';
import { serializeSavedObject } from 'ui/saved_objects/helpers/serialize_saved_object';
import { SavedObjectsClient } from 'kibana/public';
import { SavedObject } from 'ui/saved_objects/types';
import { applyEsResp } from 'ui/saved_objects/helpers/apply_es_resp';
import { saveSavedObject } from 'ui/saved_objects/helpers/save_saved_object';
import { expandShorthand } from '../../../../../plugins/kibana_utils/public';
import { IndexPatterns } from '../../../../core_plugins/data/public';

interface SavedObjectConfig {
  id?: string;
  type?: string;
  defaults?: any;
  mapping?: any;
  afterESResp?: any;
  extractReferences?: any;
  injectReferences?: any;
  searchSource?: any;
  init?: any;
  migrationVersion?: any;
  clearSavedIndexPattern?: any;
  indexPattern?: any;
}

export function buildSavedObject(
  savedObject: SavedObject,
  config: SavedObjectConfig = {},
  indexPatterns: IndexPatterns,
  savedObjectsClient: SavedObjectsClient,
  confirmModalPromise: any,
  AngularPromise: PromiseService
) {
  // type name for this object, used as the ES-type
  const esType = config.type || '';

  savedObject.getDisplayName = () => esType;

  // NOTE: this.type (not set in this file, but somewhere else) is the sub type, e.g. 'area' or
  // 'data table', while esType is the more generic type - e.g. 'visualization' or 'saved search'.
  savedObject.getEsType = () => esType;

  /**
   * Flips to true during a save operation, and back to false once the save operation
   * completes.
   * @type {boolean}
   */
  savedObject.isSaving = false;
  savedObject.defaults = config.defaults || {};

  // mapping definition for the fields that this object will expose
  const mapping = expandShorthand(config.mapping);

  const afterESResp = config.afterESResp || _.noop;
  const customInit = config.init || _.noop;
  const extractReferences = config.extractReferences;
  const injectReferences = config.injectReferences;

  // optional search source which this object configures
  savedObject.searchSource = config.searchSource ? new SearchSource() : undefined;

  // the id of the document
  savedObject.id = config.id || void 0;

  // the migration version of the document, should only be set on imports
  savedObject.migrationVersion = config.migrationVersion;

  // Whether to create a copy when the object is saved. This should eventually go away
  // in favor of a better rename/save flow.
  savedObject.copyOnSave = false;

  /**
   * After creation or fetching from ES, ensure that the searchSources index indexPattern
   * is an bonafide IndexPattern object.
   *
   * @return {Promise<IndexPattern | null>}
   */
  savedObject.hydrateIndexPattern = (id?: string) => {
    return hydrateIndexPattern(
      id || '',
      savedObject,
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
  savedObject.init = _.once(() =>
    intializeSavedObject(esType, savedObject, savedObjectsClient, afterESResp, customInit)
  );

  savedObject.applyESResp = (resp: any) =>
    applyEsResp(
      resp,
      savedObject,
      esType,
      config,
      mapping,
      savedObject.hydrateIndexPattern!,
      afterESResp,
      injectReferences,
      AngularPromise
    );

  /**
   * Serialize this object
   * @return {Object}
   */
  savedObject._serialize = () => serializeSavedObject(savedObject, mapping);

  /**
   * Returns true if the object's original title has been changed. New objects return false.
   * @return {boolean}
   */
  savedObject.isTitleChanged = () => {
    return savedObject._source && savedObject._source.title !== savedObject.title;
  };

  savedObject.creationOpts = (opts: Record<string, any> = {}) => ({
    id: savedObject.id,
    migrationVersion: savedObject.migrationVersion,
    ...opts,
  });

  savedObject.save = (opts: any) => {
    return saveSavedObject(esType, savedObject, savedObjectsClient, confirmModalPromise, Promise, {
      ...opts,
      extractReferences,
    });
  };

  savedObject.destroy = () => {};

  /**
   * Delete this object from Elasticsearch
   * @return {promise}
   */
  savedObject.delete = () => {
    if (savedObject.id) {
      return savedObjectsClient.delete(esType, savedObject.id);
    }
  };
}
