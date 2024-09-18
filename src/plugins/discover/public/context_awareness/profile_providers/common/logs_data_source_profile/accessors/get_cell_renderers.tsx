/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { getSummaryColumn } from '../../../../../components/data_types/logs/summary_column';
import {
  LOG_LEVEL_FIELDS,
  SERVICE_NAME_FIELDS,
} from '../../../../../../common/data_types/logs/constants';
import { getLogLevelBadgeCell } from '../../../../../components/data_types/logs/log_level_badge_cell';
import { getServiceNameCell } from '../../../../../components/data_types/logs/service_name_cell';
import type { DataSourceProfileProvider } from '../../../../profiles';
import { ProfileProviderServices } from '../../../profile_provider_services';

export const makeGetCellRenderersHandler =
  (services: ProfileProviderServices): DataSourceProfileProvider['profile']['getCellRenderers'] =>
  (prev) =>
  (params) => ({
    ...prev(params),
    ...LOG_LEVEL_FIELDS.reduce(
      (acc, field) => ({
        ...acc,
        [field]: getLogLevelBadgeCell(field),
        [`${field}.keyword`]: getLogLevelBadgeCell(`${field}.keyword`),
      }),
      {}
    ),
    ...SERVICE_NAME_FIELDS.reduce(
      (acc, field) => ({
        ...acc,
        [field]: getServiceNameCell(field),
        [`${field}.keyword`]: getServiceNameCell(`${field}.keyword`),
      }),
      {}
    ),
    [SOURCE_COLUMN]: getSummaryColumn({ data: services.data, params }),
  });
