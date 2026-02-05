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
import {
  LOG_LEVEL_FIELDS,
  SERVICE_NAME_FIELDS,
} from '../../../../../../common/data_types/logs/constants';
import { getServiceNameCell } from '../../../../../components/data_types/logs/service_name_cell';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

/**
 * Provides custom cell renderers for log-specific fields
 * - Log level fields get colored badges
 * - Service name fields get APM links (if APM app is available)
 * - Summary column shows log content preview
 * 
 * Capability-aware: Service name cells only added if APM exists
 */
export const createGetCellRenderers = (services: ProfileProviderServices) => {
  const getCellRenderers: DataSourceProfileProvider['profile']['getCellRenderers'] =
    (prev) => (params) => {
      // Check if APM app is available
      const hasApm = services.core?.application?.applications$?.value?.has('apm') ?? false;

      return {
        ...prev(params),
        // Add log level badge rendering for all log level fields
        ...LOG_LEVEL_FIELDS.reduce(
          (acc, field) => ({
            ...acc,
            [field]: getLogLevelBadgeCell(field),
            [`${field}.keyword`]: getLogLevelBadgeCell(`${field}.keyword`),
          }),
          {}
        ),
        // Add service name cells with APM links if APM is available
        ...(hasApm
          ? SERVICE_NAME_FIELDS.reduce(
              (acc, field) => ({
                ...acc,
                [field]: getServiceNameCell(field, params),
                [`${field}.keyword`]: getServiceNameCell(`${field}.keyword`, params),
              }),
              {}
            )
          : {}),
        // Add summary column for log preview
        [SOURCE_COLUMN]: getSummaryColumn(params),
      };
    };

  return getCellRenderers;
};
