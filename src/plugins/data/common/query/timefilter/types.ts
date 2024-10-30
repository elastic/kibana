/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Moment } from 'moment';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RefreshInterval = {
  pause: boolean;
  value: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TimeRange = {
  from: string;
  to: string;
  mode?: 'absolute' | 'relative';
};

export interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}
