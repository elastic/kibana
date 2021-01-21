/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

export function calculateAggRoot(doc, column) {
  let aggRoot = `aggs.pivot.aggs.${column.id}.aggs`;
  if (_.has(doc, `aggs.pivot.aggs.${column.id}.aggs.column_filter`)) {
    aggRoot = `aggs.pivot.aggs.${column.id}.aggs.column_filter.aggs`;
  }
  return aggRoot;
}
