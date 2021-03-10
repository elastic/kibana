/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Capabilities, IUiSettingsClient } from 'kibana/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { getSortForSearchSource } from '../angular/doc_table';
import { ISearchSource } from '../../../../data/common';
import { AppState } from '../angular/discover_state';
import type { SavedSearch, SortOrder } from '../../saved_searches/types';

/**
 * Preparing data to share the current state as link or CSV/Report
 */
export async function getSharingData(
  currentSearchSource: ISearchSource,
  state: AppState | SavedSearch,
  config: IUiSettingsClient
) {
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index')!;

  searchSource.setField(
    'sort',
    getSortForSearchSource(state.sort as SortOrder[], index, config.get(SORT_DEFAULT_ORDER_SETTING))
  );
  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  // Set the fields of the search source to match the saved search columns
  searchSource.removeField('fields');
  searchSource.removeField('fieldsFromSource');

  let columns = state.columns || [];

  // NOTE: A newly saved search with no columns selected has a bug(?) where the
  // column array is a single '_source' value which is invalid for CSV export
  if (columns && columns.length === 1 && /^_source$/.test(columns.join())) {
    columns = [];
  }

  // conditionally add the time field column
  let timeFieldName: string | undefined;
  const hideTimeColumn = config.get(DOC_HIDE_TIME_COLUMN_SETTING);
  if (!hideTimeColumn && index && index.timeFieldName) {
    timeFieldName = index.timeFieldName;
  }

  if (columns && columns.length > 0 && timeFieldName) {
    columns = [timeFieldName, ...columns];
  }

  if (columns.length === 0) {
    searchSource.setField('fields', ['*']);
  } else {
    searchSource.setField('fields', columns);
  }

  return {
    searchSource: searchSource.getSerializedFields(true),
  };
}

/**
 * makes getSharingData lazy loadable
 */
export function getSharingDataModule() {}

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
