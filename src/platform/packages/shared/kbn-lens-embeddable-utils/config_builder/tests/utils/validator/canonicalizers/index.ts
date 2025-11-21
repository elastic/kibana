/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Canonicalizer } from './types';
import { canonicalizeXY } from './xy';
import { canonicalizeMetric } from './metric';
import { canonicalizeLegacyMetric } from './legacy_metric';
import { canonicalizeGauge } from './gauge';
import { canonicalizeTagcloud } from './tagcloud';

const chartCanonicalizers = {
  xy: canonicalizeXY,
  gauge: canonicalizeGauge,
  tagcloud: canonicalizeTagcloud,
  metric: canonicalizeMetric,
  legacyMetric: canonicalizeLegacyMetric,
} satisfies Record<string, Canonicalizer>;

export function getChartCanonicalizer(chartType: string): Canonicalizer | undefined {
  return (chartCanonicalizers as any)[chartType];
}
