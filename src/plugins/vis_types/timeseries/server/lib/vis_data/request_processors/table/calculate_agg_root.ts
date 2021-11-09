/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { has } from 'lodash';

import type { TableSearchRequest } from '../table/types';
import type { Series } from '../../../../../common/types';

export function calculateAggRoot(doc: TableSearchRequest, column: Series) {
  let aggRoot = `aggs.pivot.aggs.${column.id}.aggs`;

  if (has(doc, `aggs.pivot.aggs.${column.id}.aggs.column_filter`)) {
    aggRoot = `aggs.pivot.aggs.${column.id}.aggs.column_filter.aggs`;
  }
  return aggRoot;
}
