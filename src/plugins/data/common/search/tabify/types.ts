/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Moment } from 'moment';
import { RangeFilterParams } from '@kbn/es-query';
import { IAggConfig } from '../aggs';

/** @internal **/
export interface TabbedRangeFilterParams extends RangeFilterParams {
  name: string;
}

/** @internal */
export interface TimeRangeInformation {
  from?: Moment;
  to?: Moment;
  timeFields: string[];
}

export interface TabbedResponseWriterOptions {
  metricsAtAllLevels: boolean;
  partialRows: boolean;
  timeRange?: TimeRangeInformation;
}

/** @internal */
export interface AggResponseBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
}

/** @public **/
export interface TabbedAggColumn {
  aggConfig: IAggConfig;
  id: string;
  name: string;
  hasPrecisionError?: boolean;
}

/** @public **/
export type TabbedAggRow = Record<TabbedAggColumn['id'], string | number>;
