/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataView, DataViewType } from '@kbn/data-views-plugin/common';
import { UnifiedHistogramChartContext } from '../types';

export function checkChartAvailability({
  chart,
  dataView,
  isPlainRecord,
}: {
  chart?: UnifiedHistogramChartContext;
  dataView: DataView;
  isPlainRecord?: boolean;
}): boolean {
  return Boolean(
    chart &&
      dataView.id &&
      dataView.type !== DataViewType.ROLLUP &&
      (isPlainRecord || (!isPlainRecord && dataView.isTimeBased()))
  );
}
