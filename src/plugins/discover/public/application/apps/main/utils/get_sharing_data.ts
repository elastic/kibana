/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Capabilities, IUiSettingsClient } from 'kibana/public';
import { ISearchSource } from '../../../../../../data/common';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';
import type { SavedSearch, SortOrder } from '../../../../saved_searches/types';
import { AppState } from '../services/discover_state';
import { getSortForSearchSource } from '../../../angular/doc_table';

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

  // Columns that the user has selected in the saved search
  let columns = state.columns || [];

  if (columns && columns.length > 0) {
    // conditionally add the time field column:
    let timeFieldName: string | undefined;
    const hideTimeColumn = config.get(DOC_HIDE_TIME_COLUMN_SETTING);
    if (!hideTimeColumn && index && index.timeFieldName) {
      timeFieldName = index.timeFieldName;
    }
    if (timeFieldName && !columns.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }
  }

  return {
    searchSource: searchSource.getSerializedFields(true),
    columns,
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
