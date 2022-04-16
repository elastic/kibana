/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { Moment } from 'moment-timezone';
import { METRIC_TYPE } from '.';

export interface ApplicationUsageMetric {
  type: METRIC_TYPE.APPLICATION_USAGE;
  appId: string;
  viewId: string;
  startTime: Moment;
  numberOfClicks: number;
}

export function createApplicationUsageMetric(
  appId: string,
  viewId: string
): ApplicationUsageMetric {
  return {
    type: METRIC_TYPE.APPLICATION_USAGE,
    appId,
    viewId,
    startTime: moment(),
    numberOfClicks: 0,
  };
}
