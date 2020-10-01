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
import { IUiSettingsClient } from 'kibana/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { getSortForSearchSource } from '../angular/doc_table';
import { IndexPattern, SearchSource } from '../../../../data/common';
import { AppState } from '../angular/discover_state';

const getSharingDataFields = async (
  getFieldCounts,
  selectedFields,
  timeFieldName,
  hideTimeColumn
) => {
  if (selectedFields.length === 1 && selectedFields[0] === '_source') {
    const fieldCounts = await getFieldCounts();
    return {
      searchFields: null,
      selectFields: Object.keys(fieldCounts).sort(),
    };
  }

  const fields =
    timeFieldName && !hideTimeColumn ? [timeFieldName, ...selectedFields] : selectedFields;
  return {
    searchFields: fields,
    selectFields: fields,
  };
};

export async function getSharingData(
  currentSearchSource: SearchSource,
  state: AppState,
  indexPattern: IndexPattern,
  config: IUiSettingsClient,
  getFieldCounts: any
) {
  const searchSource = currentSearchSource.createCopy();

  const { searchFields, selectFields } = await getSharingDataFields(
    getFieldCounts,
    state.columns,
    indexPattern.timeFieldName,
    config.get(DOC_HIDE_TIME_COLUMN_SETTING)
  );
  searchSource.setField('fields', searchFields);
  searchSource.setField(
    'sort',
    getSortForSearchSource(state.sort, indexPattern, config.get(SORT_DEFAULT_ORDER_SETTING))
  );
  searchSource.setField('highlight', null);
  searchSource.setField('highlightAll', null);
  searchSource.setField('aggs', null);
  searchSource.setField('size', null);

  const body = await searchSource.getSearchRequestBody();
  return {
    searchRequest: {
      index: searchSource.getField('index').title,
      body,
    },
    fields: selectFields,
    metaFields: indexPattern.metaFields,
    conflictedTypesFields: indexPattern.fields
      .filter((f) => f.type === 'conflict')
      .map((f) => f.name),
    indexPatternId: searchSource.getField('index').id,
  };
}
