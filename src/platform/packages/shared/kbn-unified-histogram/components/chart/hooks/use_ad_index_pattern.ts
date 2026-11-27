/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { DataSource } from '@kbn/data-source';

/**
 * Returns the index pattern, and the data view id when there is one, which anomaly detection works on,
 * or nothing when the data source (a data view or an ES|QL query) has no time field.
 * The values are primitives so a new data source object for the same data view changes nothing.
 */
export const useAdIndexPattern = (
  dataSource: DataSource | undefined
): { indexPattern?: string; dataViewId?: string } =>
  useMemo(() => {
    if (dataSource?.kind === 'esql') {
      // The index pattern is the one the query reads from
      return dataSource.timeFieldName ? { indexPattern: dataSource.title } : {};
    }
    if (dataSource?.kind !== 'index-pattern') {
      return {};
    }
    const dataView = dataSource.getDataView();
    return dataView.isTimeBased()
      ? { indexPattern: dataView.getIndexPattern(), dataViewId: dataView.id }
      : {};
  }, [dataSource]);
