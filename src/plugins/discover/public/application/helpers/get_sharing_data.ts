/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities, IUiSettingsClient } from 'kibana/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { getSortForSearchSource } from '../angular/doc_table';
import { ISearchSource } from '../../../../data/common';
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
  currentSearchSource: ISearchSource,
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

export interface DiscoverCapabilities {
  createShortUrl?: boolean;
  save?: boolean;
  saveQuery?: boolean;
  show?: boolean;
  storeSearchSession?: boolean;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.discover) return false;

  const discover = (anonymousUserCapabilities.discover as unknown) as DiscoverCapabilities;

  return !!discover.show;
};
