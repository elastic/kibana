/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceType, DataViewDataSource, DiscoverDataSource, EsqlDataSource } from './types';

export const createDataViewDataSource = ({
  dataViewId,
}: {
  dataViewId: string;
}): DataViewDataSource => ({
  type: DataSourceType.DataView,
  dataViewId,
});

export const createEsqlDataSource = (): EsqlDataSource => ({
  type: DataSourceType.Esql,
});

export const isDataSourceType = <T extends DataSourceType>(
  dataSource: DiscoverDataSource | undefined,
  type: T
): dataSource is Extract<DiscoverDataSource, { type: T }> => dataSource?.type === type;

export const isDataViewSource = (
  dataSource: DiscoverDataSource | undefined
): dataSource is DataViewDataSource => isDataSourceType(dataSource, DataSourceType.DataView);

export const isEsqlSource = (
  dataSource: DiscoverDataSource | undefined
): dataSource is EsqlDataSource => isDataSourceType(dataSource, DataSourceType.Esql);
