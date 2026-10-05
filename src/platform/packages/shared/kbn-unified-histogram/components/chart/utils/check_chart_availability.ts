/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSource } from '@kbn/data-source';
import type { UnifiedHistogramChartContext } from '../../../types';

export function checkChartAvailability({
  chart,
  dataSource,
  isPlainRecord,
}: {
  chart?: UnifiedHistogramChartContext;
  dataSource: DataSource | undefined;
  isPlainRecord?: boolean;
}): boolean {
  return Boolean(
    chart &&
      dataSource &&
      dataSource.id &&
      !dataSource.isRollup() &&
      (isPlainRecord || (!isPlainRecord && dataSource.isTimeBased()))
  );
}
