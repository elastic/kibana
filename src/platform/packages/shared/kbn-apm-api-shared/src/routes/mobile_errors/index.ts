/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mobileHttpErrorRateRoute } from './mobile_http_error_rate';
import { mobileErrorsDetailedStatisticsRoute } from './mobile_errors_detailed_statistics';
import { mobileErrorTermsRoute } from './mobile_error_terms';
import { mobileErrorsMainStatisticsRoute } from './mobile_errors_main_statistics';

export const mobileErrorsRouteDefinitions = {
  httpErrorRate: mobileHttpErrorRateRoute,
  detailedStatistics: mobileErrorsDetailedStatisticsRoute,
  errorTerms: mobileErrorTermsRoute,
  mainStatistics: mobileErrorsMainStatisticsRoute,
};

export type { MobileHttpErrorsTimeseries } from './mobile_http_error_rate';
export type {
  MobileErrorGroupDetailedStat,
  MobileErrorGroupPeriodsResponse,
} from './mobile_errors_detailed_statistics';
export type {
  MobileErrorTermsByFieldResponse,
  MobileErrorTermsRouteResponse,
} from './mobile_error_terms';
export type {
  MobileErrorGroupMainStatisticsResponse,
  MobileErrorsMainStatisticsRouteResponse,
} from './mobile_errors_main_statistics';
