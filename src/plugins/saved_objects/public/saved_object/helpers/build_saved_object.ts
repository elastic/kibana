/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { hydrateIndexPattern } from './hydrate_index_pattern';
import { intializeSavedObject } from './initialize_saved_object';
import { serializeSavedObject } from './serialize_saved_object';

import {
  EsResponse,
  SavedObject,
  SavedObjectConfig,
  SavedObjectKibanaServices,
  SavedObjectSaveOpts,
} from '../../types';
import { applyESResp } from './apply_es_resp';
import { saveSavedObject } from './save_saved_object';
import { SavedObjectDecorator } from '../decorators';

const applyDecorators = (
  object: SavedObject,
  config: SavedObjectConfig,
  decorators: SavedObjectDecorator[]
) => {
  decorators.forEach((decorator) => {
    decorator.decorateConfig(config);
    decorator.decorateObject(object);
  });
};

export function buildSavedObject(
  savedObject: SavedObject,
  config: SavedObjectConfig,
  services: SavedObjectKibanaServices,
  decorators: SavedObjectDecorator[] = []
) {
  applyDecorators(savedObject, config, decorators);

  const { dataViews, savedObjectsClient } = services;
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
  // optional search source which this object configures
  savedObject.searchSource = config.searchSource
    ? services.search.searchSource.createEmpty()
    : undefined;
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
  savedObject.hydrateIndexPattern = (id?: string) =>
    hydrateIndexPattern(id || '', savedObject, dataViews, config);
  /**
   * Asynchronously initialize this object - will only run
   * once even if called multiple times.
   *
   * @return {Promise}
   * @resolved {SavedObject}
   */
  savedObject.init = once(() => intializeSavedObject(savedObject, savedObjectsClient, config));

  savedObject.applyESResp = (resp: EsResponse) => applyESResp(resp, savedObject, config, services);

  /**
   * Serialize this object
   * @return {Object}
   */
  savedObject._serialize = () => serializeSavedObject(savedObject, config);

  /**
   * Returns true if the object's original title has been changed. New objects return false.
   * @return {boolean}
   */
  savedObject.isTitleChanged = () =>
    savedObject._source && savedObject._source.title !== savedObject.title;

  savedObject.creationOpts = (opts: Record<string, any> = {}) => ({
    id: savedObject.id,
    migrationVersion: savedObject.migrationVersion,
    ...opts,
  });

  savedObject.save = async (opts: SavedObjectSaveOpts) => {
    try {
      const result = await saveSavedObject(savedObject, config, opts, services);
      return Promise.resolve(result);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  savedObject.destroy = () => {};

  /**
   * Delete this object from Elasticsearch
   * @return {promise}
   */
  savedObject.delete = () => {
    if (!savedObject.id) {
      return Promise.reject(new Error('Deleting a saved Object requires type and id'));
    }
    return savedObjectsClient.delete(esType, savedObject.id);
  };
}
