/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type EuiTablePersistInjectedProps } from '@kbn/shared-ux-table-persist/src';
interface DataTableFormatProps {
  data: Datatable;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
  uiActions: UiActionsStart;
  isFilterable: (column: DatatableColumn) => boolean;
  missingValueDisplay?: 'text' | 'table';
}
export declare const DataTableFormat: React.FC<
  import('@kbn/shared-ux-table-persist/src').HOCProps<
    DatatableRow,
    Omit<DataTableFormatProps & EuiTablePersistInjectedProps<DatatableRow>, 'euiTablePersist'>
  >
>;
export {};
