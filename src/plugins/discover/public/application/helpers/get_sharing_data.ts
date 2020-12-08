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
import { SearchSource } from '../../../../data/common';
import { AppState } from '../angular/discover_state';
import { SortOrder } from '../../saved_searches/types';

const getSharingDataFields = async (
  getFieldCounts: () => Promise<Record<string, number>>,
  selectedFields: string[],
  timeFieldName: string,
  hideTimeColumn: boolean
) => {
  if (selectedFields.length === 1 && selectedFields[0] === '_source') {
    const fieldCounts = await getFieldCounts();
    return {
      searchFields: undefined,
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

/**
 * Preparing data to share the current state as link or CSV/Report
 */
export async function getSharingData(
  currentSearchSource: SearchSource,
  state: AppState,
  config: IUiSettingsClient,
  getFieldCounts: () => Promise<Record<string, number>>
) {
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index')!;

  const { searchFields, selectFields } = await getSharingDataFields(
    getFieldCounts,
    state.columns || [],
    index.timeFieldName || '',
    config.get(DOC_HIDE_TIME_COLUMN_SETTING)
  );
  searchSource.setField('fieldsFromSource', searchFields);
  searchSource.setField(
    'sort',
    getSortForSearchSource(state.sort as SortOrder[], index, config.get(SORT_DEFAULT_ORDER_SETTING))
  );
  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  const body = await searchSource.getSearchRequestBody();

  return {
    searchRequest: {
      index: index.title,
      body,
    },
    fields: selectFields,
    metaFields: index.metaFields,
    conflictedTypesFields: index.fields.filter((f) => f.type === 'conflict').map((f) => f.name),
    indexPatternId: index.id,
  };
}
