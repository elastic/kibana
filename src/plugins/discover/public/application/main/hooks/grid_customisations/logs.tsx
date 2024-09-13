/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONTENT_FIELD, RESOURCE_FIELD } from '../../../../../common/data_types/logs/constants';
import { renderCell } from '../../../../components/discover_grid/virtual_columns/logs/cell_renderer';
import { renderColumn } from '../../../../components/discover_grid/virtual_columns/logs/column';

export const getLogsVirtualColumnsConfiguration = (data: DataPublicPluginStart) => {
  return {
    customCellRenderer: createCustomCellRenderer({ data }),
    customGridColumnsConfiguration: createCustomGridColumnsConfiguration(),
  };
};

export const createCustomCellRenderer = ({ data }: { data: DataPublicPluginStart }) => {
  return {
    [CONTENT_FIELD]: renderCell(CONTENT_FIELD, { data }),
    [RESOURCE_FIELD]: renderCell(RESOURCE_FIELD, { data }),
  };
};

export const createCustomGridColumnsConfiguration = () => ({
  [CONTENT_FIELD]: renderColumn(CONTENT_FIELD),
  [RESOURCE_FIELD]: renderColumn(RESOURCE_FIELD),
});
