/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
export declare const getRelativeTimeValueAndUnitFromTimeString: (dateString?: string) =>
  | {
      value: number;
      unit: string | undefined;
      roundingUnit: string | undefined;
    }
  | undefined;
export declare const convertRelativeTimeStringToAbsoluteTimeDate: (
  dateString?: string,
  options?: {
    roundUp?: boolean;
  }
) => Date | undefined;
export declare const convertRelativeTimeStringToAbsoluteTimeString: (
  dateString: string,
  options?: {
    roundUp?: boolean;
  }
) => string;
export declare const isTimeRangeAbsoluteTime: (timeRange?: TimeRange) => boolean;
