/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedFieldListPlugin } from './plugin';

export type {
  FieldStatsResponse,
  BucketedAggregation,
  NumberStatsResult,
  TopValuesResult,
} from '../common/types';
export type { FieldStatsProps, FieldStatsFromSampleProps } from './components/field_stats';
export { FieldStats, FieldStatsFromSample } from './components/field_stats';
export { BASE_API_PATH, FIELD_STATS_API_PATH } from '../common/constants';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new UnifiedFieldListPlugin();
}
export type { UnifiedFieldListPluginSetup, UnifiedFieldListPluginStart } from './types';

export { fetchFieldStats } from '../common/services/field_stats';
