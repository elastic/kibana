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
  columns: EuiDataGridColumn[];
  columnsOverrides?: AlertsTableConfiguration['columns'];
  visibleColumns?: AlertsTableConfiguration['visibleColumns'];
}

/**
 * Merges the configured columns with the default/initial columns.
 */
export const applyColumnsConfiguration = ({
  columns,
  columnsOverrides,
}: ApplyColumnsConfigurationParams) => {
  if (!columnsOverrides?.length) {
    // No overrides to apply, return the original columns
    return columns;
  }
  // Apply overrides to configured columns
  return columnsOverrides.map((columnOverrides) => {
    const column = columns.find((o) => o.id === columnOverrides.id) ?? {};
    return { ...column, ...columnOverrides };
  });
};
