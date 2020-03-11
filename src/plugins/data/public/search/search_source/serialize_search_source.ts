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
import { SavedObjectReference } from 'kibana/public';
import { ISearchSource } from './search_source';
import { SearchSourceFields } from './types';
import { Filter } from '../../../common/es_query/filters';

function getFilters(filterField: SearchSourceFields['filter']): Filter[] {
  if (!filterField) {
    return [];
  }

  if (Array.isArray(filterField)) {
    return filterField;
  }

  if (_.isFunction(filterField)) {
    return getFilters(filterField());
  }

  return [filterField];
}

export function serializeSearchSource(searchSource: ISearchSource) {
  const references: SavedObjectReference[] = [];

  const {
    filter: originalFilters,
    ...searchSourceFields
  }: Omit<SearchSourceFields, 'sort' | 'size'> = _.omit(searchSource.getFields(), ['sort', 'size']);
  let serializedSearchSourceFields: Omit<SearchSourceFields, 'sort' | 'size' | 'filter'> & {
    indexRefName?: string;
    filter?: Array<Omit<Filter, 'meta'> & { meta: Filter['meta'] & { indexRefName?: string } }>;
  } = searchSourceFields;
  if (searchSourceFields.index) {
    const indexId = searchSourceFields.index.id!;
    const refName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    references.push({
      name: refName,
      type: 'index-pattern',
      id: indexId,
    });
    serializedSearchSourceFields = {
      ...searchSourceFields,
      indexRefName: refName,
      index: undefined,
    };
  }
  if (originalFilters) {
    const filters = getFilters(originalFilters);
    serializedSearchSourceFields = {
      ...searchSourceFields,
      filter: filters.map((filterRow, i) => {
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

  return { searchSourceJSON: JSON.stringify(serializedSearchSourceFields), references };
}
