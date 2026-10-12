/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getDataViewFieldOrCreateFromColumn } from '@kbn/data-view-utils';

/** The data view field of a column; for an ES|QL source, typed by the ES|QL column. */
export const getDataViewFieldFromDataSource = ({
  dataView,
  dataSource,
  fieldName,
}: {
  dataView: DataView;
  dataSource: DataSource | undefined;
  fieldName: string;
}) =>
  getDataViewFieldOrCreateFromColumn({
    dataView,
    fieldName,
    column: dataSource?.kind === 'esql' ? dataSource.getColumn(fieldName) : undefined,
  });
