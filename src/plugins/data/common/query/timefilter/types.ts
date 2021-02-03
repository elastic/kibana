/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Moment } from 'moment';

export interface RefreshInterval {
  pause: boolean;
  value: number;
}

// eslint-disable-next-line
export type TimeRange = {
  from: string;
  to: string;
  mode?: 'absolute' | 'relative';
};

export interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}
