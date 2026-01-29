/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import type { AlertsTableConfiguration } from '../schemas/alerts_table_configuration_schema';

interface ApplyColumnsConfigurationParams {
  defaultColumns: EuiDataGridColumn[];
  configuredColumns?: AlertsTableConfiguration['columns'];
  visibleColumns?: AlertsTableConfiguration['visibleColumns'];
}

/**
 * Merges the configured columns with the default columns.
 */
export const applyColumnsConfiguration = ({
  defaultColumns,
  configuredColumns,
}: ApplyColumnsConfigurationParams) => {
  if (!configuredColumns?.length) {
    // User didn't customize the columns, return the original ones
    return defaultColumns;
  }
  // Enrich the configured columns with the properties from the original columns
  return configuredColumns.map((columnOverrides) => {
    const column = defaultColumns.find((o) => o.id === columnOverrides.id) ?? {};
    return { ...column, ...columnOverrides };
  });
};
