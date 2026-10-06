/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment';
import type { Unit } from '@kbn/datemath';
export interface EsInterval {
  expression: string;
  unit: Unit;
  value: number;
}
/**
 * Convert a moment.duration into an es
 * compatible expression, and provide
 * associated metadata
 *
 * @param  {moment.duration} duration
 * @return {object}
 */
export declare function convertDurationToNormalizedEsInterval(
  duration: moment.Duration,
  targetUnit?: Unit
): EsInterval;
export declare function convertIntervalToEsInterval(interval: string): EsInterval;
declare module 'moment' {
  interface Locale {
    _config: moment.LocaleSpecification;
  }
}
export declare function getPreciseDurationDescription(
  intervalValue: number,
  unit: moment.unitOfTime.Base
): string;
