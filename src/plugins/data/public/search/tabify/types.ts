/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
