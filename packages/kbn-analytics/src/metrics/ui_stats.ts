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

import { Stats } from './stats';
import { METRIC_TYPE } from './';

export type UiStatsMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT;
export interface UiStatsMetricConfig<T extends UiStatsMetricType> {
  type: T;
  appName: string;
  eventName: string;
  count?: number;
}

export interface UiStatsMetric<T extends UiStatsMetricType = UiStatsMetricType> {
  type: T;
  appName: string;
  eventName: string;
  count: number;
}

export function createUiStatsMetric<T extends UiStatsMetricType>({
  type,
  appName,
  eventName,
  count = 1,
}: UiStatsMetricConfig<T>): UiStatsMetric<T> {
  return { type, appName, eventName, count };
}

export interface UiStatsMetricReport {
  key: string;
  appName: string;
  eventName: string;
  type: UiStatsMetricType;
  stats: Stats;
}
