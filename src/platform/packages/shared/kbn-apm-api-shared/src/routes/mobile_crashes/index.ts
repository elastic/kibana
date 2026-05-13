/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { crashDistributionRoute } from './crash_distribution';
import { crashMainStatisticsRoute } from './crash_main_statistics';
import { crashDetailedStatisticsRoute } from './crash_detailed_statistics';

export const mobileCrashesRouteDefinitions = {
  distribution: crashDistributionRoute,
  mainStatistics: crashMainStatisticsRoute,
  detailedStatistics: crashDetailedStatisticsRoute,
};

export type { CrashDistributionResponse } from './crash_distribution';
export type {
  MobileCrashGroupMainStatisticsResponse,
  CrashMainStatisticsRouteResponse,
} from './crash_main_statistics';
export type {
  CrashGroupDetailedStat,
  MobileCrashesGroupPeriodsResponse,
} from './crash_detailed_statistics';
