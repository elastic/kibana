/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import moment from 'moment';
import { Chart } from './point_series';
import { Table } from '../../types';

export function initXAxis(chart: Chart, table: Table) {
  const { format, title, params, accessor } = chart.aspects.x[0];

  chart.xAxisOrderedValues =
    accessor === -1 && 'defaultValue' in params
      ? [params.defaultValue]
      : uniq(table.rows.map((r) => r[accessor]));
  chart.xAxisFormat = format;
  chart.xAxisLabel = title;

  if ('interval' in params) {
    if ('date' in params) {
      const { intervalESUnit, intervalESValue } = params;

      chart.ordered = {
        interval: moment.duration(intervalESValue, intervalESUnit as any),
        intervalESUnit,
        intervalESValue,
      };
    } else {
      chart.ordered = {
        interval: params.interval,
      };
    }
  }
}
