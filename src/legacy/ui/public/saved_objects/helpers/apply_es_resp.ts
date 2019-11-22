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
import { SavedObject } from 'ui/saved_objects/types';
import { parseSearchSource } from 'ui/saved_objects/helpers/parse_search_source';
import { SavedObjectNotFound } from '../../../../../plugins/kibana_utils/public';

type EsResponse = Record<string, any>;

export async function applyESResp(
  resp: EsResponse,
  savedObject: SavedObject,
  esType: string,
  config: any,
  mapping: any,
  hydrateIndexPattern: () => void,
  afterESResp: () => void,
  injectReferences: any,
  AngularPromise: any
) {
  savedObject._source = _.cloneDeep(resp._source);

  if (resp.found != null && !resp.found) {
    throw new SavedObjectNotFound(esType, savedObject.id || '');
  }

  const meta = resp._source.kibanaSavedObjectMeta || {};
  delete resp._source.kibanaSavedObjectMeta;

  if (!config.indexPattern && savedObject._source.indexPattern) {
    config.indexPattern = savedObject._source.indexPattern;
    delete savedObject._source.indexPattern;
  }

  // assign the defaults to the response
  _.defaults(savedObject._source, savedObject.defaults);

  // transform the source using _deserializers
  _.forOwn(mapping, (fieldMapping, fieldName) => {
    if (fieldMapping._deserialize && typeof fieldName === 'string') {
      savedObject._source[fieldName] = fieldMapping._deserialize(
        savedObject._source[fieldName],
        resp,
        fieldName,
        fieldMapping
      );
    }
  });

  // Give obj all of the values in _source.fields
  _.assign(savedObject, savedObject._source);
  savedObject.lastSavedTitle = savedObject.title;

  return AngularPromise.try(() => {
    parseSearchSource(savedObject, esType, meta.searchSourceJSON, resp.references);
    return hydrateIndexPattern();
  })
    .then(() => {
      if (injectReferences && resp.references && resp.references.length > 0) {
        injectReferences(savedObject, resp.references);
      }
      return savedObject;
    })
    .then(() => {
      return AngularPromise.cast(afterESResp.call(savedObject));
    });
}
