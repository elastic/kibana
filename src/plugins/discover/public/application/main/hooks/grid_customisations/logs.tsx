/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { SummaryColumnFactoryDeps } from '../../../../components/data_types/logs/summary_column/summary_column';
import { getSummaryColumn } from '../../../../components/data_types/logs/summary_column';

export type DataGridColumnsDeps = CustomCellRendererDeps;

export const getDataGridColumnsConfiguration = ({ data, params }: DataGridColumnsDeps) => {
  return {
    customCellRenderer: createCustomCellRenderer({ data, params }),
    customGridColumnsConfiguration: createCustomGridColumnsConfiguration(),
  };
};

type CustomCellRendererDeps = SummaryColumnFactoryDeps;

export const createCustomCellRenderer = (deps: CustomCellRendererDeps) => {
  return {
    [SOURCE_COLUMN]: getSummaryColumn(deps),
  };
};

export const createCustomGridColumnsConfiguration = () => ({});
