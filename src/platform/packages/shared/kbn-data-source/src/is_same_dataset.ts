/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlSource } from './sources/esql_source';
import type { DataViewSource } from './sources/data_view_source';

type AnyDataSource = EsqlSource | DataViewSource;

/**
 * True when both sources represent the same dataset.
 *
 * ES|QL compares {@link EsqlSource.datasetKey} (FROM + time field), not query-instance `id`.
 * Classic and mixed switches compare `id`.
 */
export const isSameDataset = (
  current: AnyDataSource | undefined,
  next: AnyDataSource | undefined
): boolean => {
  if (!current || !next) {
    return false;
  }

  if (current.kind === 'esql' && next.kind === 'esql') {
    return current.datasetKey === next.datasetKey;
  }

  return current.id === next.id;
};
