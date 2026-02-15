/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LOG_LEVEL_FIELD } from '@kbn/discover-utils';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { DefaultAppStateColumn } from '../../../../types';

export interface CreateGetDefaultAppStateParams {
  defaultColumns?: DefaultAppStateColumn[];
}

/**
 * Sets log-optimized defaults for the Discover app state
 * - Uses log.level as breakdown field for the chart
 * - Sets default columns if provided
 * - Configures time field column width
 */
export const createGetDefaultAppState = ({
  defaultColumns,
}: CreateGetDefaultAppStateParams = {}): DataSourceProfileProvider['profile']['getDefaultAppState'] => {
  return (prev) => (params) => {
    const appState = { ...prev(params) };

    // Use log.level for chart breakdown
    appState.breakdownField = LOG_LEVEL_FIELD;

    // Set default columns if specified
    if (defaultColumns) {
      appState.columns = [];

      if (params.dataView.isTimeBased()) {
        appState.columns.push({ name: params.dataView.timeFieldName, width: 212 });
      }

      appState.columns.push(...defaultColumns);
    }

    return appState;
  };
};
