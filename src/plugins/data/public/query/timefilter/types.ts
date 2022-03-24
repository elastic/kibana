/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Moment } from 'moment';

import { TimeRange, RefreshInterval } from '../../../common';

export interface TimefilterConfig {
  timeDefaults: TimeRange;
  refreshIntervalDefaults: RefreshInterval;
}

// Timefilter accepts moment input but always returns string output
export type InputTimeRange =
  | TimeRange
  | {
      from: Moment;
      to: Moment;
    };

export type { TimeRangeBounds } from '../../../common';
