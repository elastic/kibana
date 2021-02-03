/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Moment } from 'moment';
import { RangeFilterParams } from '../../../common';
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

/** @internal **/
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
}

/** @public **/
export type TabbedAggRow = Record<TabbedAggColumn['id'], string | number>;

/** @public **/
export interface TabbedTable {
  columns: TabbedAggColumn[];
  rows: TabbedAggRow[];
}
