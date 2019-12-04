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
import angular from 'angular';
import { SavedObject, SavedObjectConfig } from '../types';
import { expandShorthand } from '../../../../../plugins/kibana_utils/public';

export function serializeSavedObject(savedObject: SavedObject, config: SavedObjectConfig) {
  // mapping definition for the fields that this object will expose
  const mapping = expandShorthand(config.mapping);
  const attributes = {} as Record<string, any>;
  const references = [];

  _.forOwn(mapping, (fieldMapping, fieldName) => {
    if (typeof fieldName !== 'string') {
      return;
    }
    // @ts-ignore
    const savedObjectFieldVal = savedObject[fieldName];
    if (savedObjectFieldVal != null) {
      attributes[fieldName] = fieldMapping._serialize
        ? fieldMapping._serialize(savedObjectFieldVal)
        : savedObjectFieldVal;
    }
  });

  if (savedObject.searchSource) {
    let searchSourceFields: Record<string, any> = _.omit(savedObject.searchSource.getFields(), [
      'sort',
      'size',
    ]);
    if (searchSourceFields.index) {
      // searchSourceFields.index will normally be an IndexPattern, but can be a string in two scenarios:
      // (1) `init()` (and by extension `hydrateIndexPattern()`) hasn't been called on  Saved Object
      // (2) The IndexPattern doesn't exist, so we fail to resolve it in `hydrateIndexPattern()`
      const indexId =
        typeof searchSourceFields.index === 'string'
          ? searchSourceFields.index
          : searchSourceFields.index.id;
      const refName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
      references.push({
        name: refName,
        type: 'index-pattern',
        id: indexId,
      });
      searchSourceFields = {
        ...searchSourceFields,
        indexRefName: refName,
        index: undefined,
      };
    }
    if (searchSourceFields.filter) {
      searchSourceFields = {
        ...searchSourceFields,
        filter: searchSourceFields.filter.map((filterRow: any, i: number) => {
          if (!filterRow.meta || !filterRow.meta.index) {
            return filterRow;
          }
          const refName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
          references.push({
            name: refName,
            type: 'index-pattern',
            id: filterRow.meta.index,
          });
          return {
            ...filterRow,
            meta: {
              ...filterRow.meta,
              indexRefName: refName,
              index: undefined,
            },
          };
        }),
      };
    }
    attributes.kibanaSavedObjectMeta = {
      searchSourceJSON: angular.toJson(searchSourceFields),
    };
  }

  return { attributes, references };
}
