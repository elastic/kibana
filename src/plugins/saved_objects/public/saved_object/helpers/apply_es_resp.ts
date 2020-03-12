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
import _, { cloneDeep, defaults, forOwn, assign } from 'lodash';
import { EsResponse, SavedObject, SavedObjectConfig } from '../../types';
import { parseSearchSource } from './parse_search_source';
import { hydrateIndexPattern as hydrateIndexPatternHelper } from './hydrate_index_pattern';
import { expandShorthand, SavedObjectNotFound } from '../../../../kibana_utils/public';
import { IndexPattern, SearchSource } from '../../../../data/public';

/**
 * A given response of and ElasticSearch containing a plain saved object is applied to the given
 * savedObject
 */
export async function applyESResp(
  resp: EsResponse,
  savedObject: SavedObject,
  config: SavedObjectConfig
) {
  const mapping = expandShorthand(config.mapping);
  const esType = config.type || '';
  savedObject._source = _.cloneDeep(resp._source);
  const injectReferences = config.injectReferences;
  const hydrateIndexPattern = savedObject.hydrateIndexPattern!;
  if (typeof resp.found === 'boolean' && !resp.found) {
    throw new SavedObjectNotFound(esType, savedObject.id || '');
  }

  const meta = resp._source.kibanaSavedObjectMeta || {};
  delete resp._source.kibanaSavedObjectMeta;

  if (!config.indexPattern && savedObject._source.indexPattern) {
    config.indexPattern = savedObject._source.indexPattern as IndexPattern;
    delete savedObject._source.indexPattern;
  }

  // assign the defaults to the response
  _.defaults(savedObject._source, savedObject.defaults);

  // transform the source using _deserializers
  _.forOwn(mapping, (fieldMapping, fieldName) => {
    if (fieldMapping._deserialize && typeof fieldName === 'string') {
      savedObject._source[fieldName] = fieldMapping._deserialize(
        savedObject._source[fieldName] as string
      );
    }
  });

  // Give obj all of the values in _source.fields
  _.assign(savedObject, savedObject._source);
  savedObject.lastSavedTitle = savedObject.title;

  await parseSearchSource(savedObject, esType, meta.searchSourceJSON, resp.references);
  await hydrateIndexPattern();
  if (injectReferences && resp.references && resp.references.length > 0) {
    injectReferences(savedObject, resp.references);
  }
  if (typeof config.afterESResp === 'function') {
    savedObject = await config.afterESResp(savedObject);
  }
  return savedObject;
}

export async function applyESRespTo(
  indexPatterns: any,
  resp: EsResponse,
  config: SavedObjectConfig
) {
  let savedObject: Record<string, any> = { id: config.id };
  savedObject._source = cloneDeep(resp._source);

  const mapping = expandShorthand(config.mapping);
  const esType = config.type || '';
  const injectReferences = config.injectReferences;

  if (typeof resp.found === 'boolean' && !resp.found) {
    throw new SavedObjectNotFound(esType, config.id || '');
  }

  const meta = resp._source.kibanaSavedObjectMeta || {};
  delete resp._source.kibanaSavedObjectMeta;

  if (!config.indexPattern && savedObject._source.indexPattern) {
    config.indexPattern = savedObject._source.indexPattern as IndexPattern;
    delete savedObject._source.indexPattern;
  }

  // assign the defaults to the response
  defaults(savedObject._source, config.defaults);

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

  // optional search source which this object configures
  savedObject.searchSource = config.searchSource ? new SearchSource() : undefined;
  // NOTE: this.type (not set in this file, but somewhere else) is the sub type, e.g. 'area' or
  // 'data table', while esType is the more generic type - e.g. 'visualization' or 'saved search'.
  savedObject.getEsType = () => esType;

  await parseSearchSource(savedObject as any, esType, meta.searchSourceJSON, resp.references);
  await hydrateIndexPatternHelper(config.id || '', savedObject as any, indexPatterns, config);

  if (injectReferences && resp.references && resp.references.length > 0) {
    injectReferences(savedObject, resp.references);
  }
  if (typeof config.afterESResp === 'function') {
    savedObject = await config.afterESResp(savedObject as any);
  }
  return savedObject;
}
