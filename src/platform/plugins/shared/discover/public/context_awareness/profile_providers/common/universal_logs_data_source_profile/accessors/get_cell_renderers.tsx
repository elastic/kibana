/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { getLogLevelBadgeCell } from '@kbn/discover-contextual-components';
import { getSummaryColumn } from '../../../../../components/data_types/logs/summary_column';
import { LOG_LEVEL_FIELDS } from '../../../../../../common/data_types/logs/constants';
import type { DataSourceProfileProvider } from '../../../../profiles';

/**
 * Provides custom cell renderers for log-specific fields
 * - Log level fields get colored badges
 * - Summary column shows log content preview
 */
export const getCellRenderers: DataSourceProfileProvider['profile']['getCellRenderers'] =
  (prev) => (params) => {
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] getCellRenderers called');
    
    const prevRenderers = prev(params);
    const result = {
      ...prevRenderers,
      // Add log level badge rendering for all log level fields
      ...LOG_LEVEL_FIELDS.reduce(
        (acc, field) => ({
          ...acc,
          [field]: getLogLevelBadgeCell(field),
          [`${field}.keyword`]: getLogLevelBadgeCell(`${field}.keyword`),
        }),
        {}
      ),
      // Add summary column for log preview
      [SOURCE_COLUMN]: getSummaryColumn(params),
    };
    
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] Cell renderers:', Object.keys(result));
    
    return result;
  };
