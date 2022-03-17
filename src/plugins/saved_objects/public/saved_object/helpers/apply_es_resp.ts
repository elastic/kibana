/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, defaults, forOwn, assign } from 'lodash';
import { EsResponse, SavedObject, SavedObjectConfig, SavedObjectKibanaServices } from '../../types';
import { isSavedObjectNotFoundError, SavedObjectNotFound } from '../../../../kibana_utils/public';
import {
  IndexPattern,
  injectSearchSourceReferences,
  parseSearchSourceJSON,
} from '../../../../data/public';
import { expandShorthand } from './field_mapping';

/**
 * A given response of and ElasticSearch containing a plain saved object is applied to the given
 * savedObject
 */
export async function applyESResp(
  resp: EsResponse,
  savedObject: SavedObject,
  config: SavedObjectConfig,
  dependencies: SavedObjectKibanaServices
) {
  const mapping = expandShorthand(config.mapping ?? {});
  const savedObjectType = config.type || '';
  savedObject._source = cloneDeep(resp._source);
  if (typeof resp.found === 'boolean' && !resp.found) {
    throw new SavedObjectNotFound(savedObjectType, savedObject.id || '');
  }

  const meta = resp._source.kibanaSavedObjectMeta || {};
  delete resp._source.kibanaSavedObjectMeta;

  if (!config.indexPattern && savedObject._source.indexPattern) {
    config.indexPattern = savedObject._source.indexPattern as IndexPattern;
    delete savedObject._source.indexPattern;
  }

  // assign the defaults to the response
  defaults(savedObject._source, savedObject.defaults);

  // transform the source using _deserializers
  forOwn(mapping, (fieldMapping, fieldName) => {
    if (fieldMapping._deserialize && typeof fieldName === 'string') {
      savedObject._source[fieldName] = fieldMapping._deserialize(
        savedObject._source[fieldName] as string
      );
    }
  });

  // Give obj all of the values in _source.fields
  assign(savedObject, savedObject._source);
  savedObject.lastSavedTitle = savedObject.title;

  if (meta.searchSourceJSON) {
    try {
      let searchSourceValues = parseSearchSourceJSON(meta.searchSourceJSON);

      if (config.searchSource) {
        searchSourceValues = injectSearchSourceReferences(
          searchSourceValues as any,
          resp.references
        );
        savedObject.searchSource = await dependencies.search.searchSource.create(
          searchSourceValues
        );
      } else {
        savedObject.searchSourceFields = searchSourceValues;
      }
    } catch (error) {
      if (isSavedObjectNotFoundError(error) && error.savedObjectType === 'index-pattern') {
        // if parsing the search source fails because the index pattern wasn't found,
        // remember the reference - this is required for error handling on legacy imports
        savedObject.unresolvedIndexPatternReference = {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          id: JSON.parse(meta.searchSourceJSON).index,
          type: 'index-pattern',
        };
      }

      throw error;
    }
  }

  const injectReferences = config.injectReferences;
  if (injectReferences && resp.references && resp.references.length > 0) {
    injectReferences(savedObject, resp.references);
  }

  if (typeof config.afterESResp === 'function') {
    savedObject = await config.afterESResp(savedObject);
  }

  return savedObject;
}
