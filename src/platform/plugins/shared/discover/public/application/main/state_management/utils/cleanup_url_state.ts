/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DiscoverAppState, AppStateUrl } from '../discover_app_state_container';
import { migrateLegacyQuery } from '../../../../utils/migrate_legacy_query';
import { getMaxAllowedSampleSize } from '../../../../utils/get_allowed_sample_size';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';

/**
 * Takes care of the given url state, migrates legacy props and cleans up empty props
 * @param appStateFromUrl
 */
export function cleanupUrlState(
  appStateFromUrl: AppStateUrl,
  uiSettings: IUiSettingsClient
): DiscoverAppState {
  const query = appStateFromUrl.query;
  const isEsqlQuery = isOfAggregateQueryType(query);

  if (!isEsqlQuery && query && !query.language) {
    appStateFromUrl.query = migrateLegacyQuery(query);
  }

  if (typeof appStateFromUrl.sort?.[0] === 'string') {
    if (appStateFromUrl.sort?.[1] === 'asc' || appStateFromUrl.sort[1] === 'desc') {
      // handling sort props like this[fieldName,direction]
      appStateFromUrl.sort = [[appStateFromUrl.sort[0], appStateFromUrl.sort[1]]];
    } else {
      delete appStateFromUrl.sort;
    }
  }

  if (appStateFromUrl.sort && !appStateFromUrl.sort.length) {
    // If there's an empty array given in the URL, the sort prop should be removed
    // This allows the sort prop to be overwritten with the default sorting
    delete appStateFromUrl.sort;
  }

  if (
    appStateFromUrl.rowsPerPage &&
    !(typeof appStateFromUrl.rowsPerPage === 'number' && appStateFromUrl.rowsPerPage > 0)
  ) {
    // remove the param if it's invalid
    delete appStateFromUrl.rowsPerPage;
  }

  if (
    appStateFromUrl.sampleSize &&
    (isEsqlQuery || // not supported yet for ES|QL
      !(
        typeof appStateFromUrl.sampleSize === 'number' &&
        appStateFromUrl.sampleSize > 0 &&
        appStateFromUrl.sampleSize <= getMaxAllowedSampleSize(uiSettings)
      ))
  ) {
    // remove the param if it's invalid
    delete appStateFromUrl.sampleSize;
  }

  if (appStateFromUrl.index) {
    if (!appStateFromUrl.dataSource) {
      // Convert the provided index to a data source
      appStateFromUrl.dataSource = isEsqlQuery
        ? createEsqlDataSource()
        : createDataViewDataSource({ dataViewId: appStateFromUrl.index });
    }

    delete appStateFromUrl.index;
  }

  return appStateFromUrl as DiscoverAppState;
}
