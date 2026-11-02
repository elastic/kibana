/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { SERVICE_NAME_FIELD } from '../../../../../../common/data_types/logs/constants';
import { getTracesSummaryColumn } from '../../../../../components/data_types/traces/summary_column';
import {
  createServiceSummaryDefinition,
  getEntitySummaryCell,
} from '../../../../../components/data_types/entity_summary';
import { getServiceNameCell } from '../../../../../components/data_types/logs/service_name_cell';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const getCellRenderers: DataSourceProfileProvider['profile']['getCellRenderers'] =
  (prev, { toolkit }) =>
  (params) => ({
    ...prev(params),
    [SOURCE_COLUMN]: getTracesSummaryColumn(params, toolkit),
    // The dedicated Service name column shows the same service-summary popover; it falls back to the
    // filter/copy badge when APM isn't available to provide the data.
    [SERVICE_NAME_FIELD]: getEntitySummaryCell({
      fieldName: SERVICE_NAME_FIELD,
      definition: createServiceSummaryDefinition(),
      toolkit,
      FallbackCell: getServiceNameCell(SERVICE_NAME_FIELD, toolkit),
    }),
  });
