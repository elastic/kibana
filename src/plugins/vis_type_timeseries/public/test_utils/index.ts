/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const UI_RESTRICTIONS = { '*': true };
export const INDEX_PATTERN = 'some-pattern';
export const FIELDS = {
  [INDEX_PATTERN]: [
    {
      type: 'date',
      name: '@timestamp',
    },
    {
      type: 'number',
      name: 'system.cpu.user.pct',
    },
    {
      type: 'histogram',
      name: 'histogram_value',
    },
  ],
};
export const METRIC = {
  id: 'sample_metric',
  type: 'avg',
  field: 'system.cpu.user.pct',
};
export const SERIES = {
  metrics: [METRIC],
};
export const PANEL = {
  type: 'timeseries',
  index_pattern: INDEX_PATTERN,
  series: SERIES,
};
