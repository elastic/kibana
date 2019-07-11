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

import { BaseReport, ReportTypes } from './report';

type StatsReport = Extract<ReportTypes, 'click' | 'loaded' | 'count'>;

interface Stats {
  sum: number;
  avg: number;
  min: number;
  max: number;
}

interface StatsMetric<AllowedStats extends keyof Stats> extends BaseReport {
  stats: Pick<Stats, AllowedStats>;
}

export interface ClickReport extends StatsMetric<'sum'> {
  type: 'click';
}

interface ClickReportConfig {
  appName: string;
  eventName: string;
}
export function createClickReport({ appName, eventName }: ClickReportConfig): ClickReport {
  return { appName, eventName, type: 'click', stats: { sum: 1 } };
}

export interface CountReport extends StatsMetric<'sum'> {
  type: 'count';
}

export interface CountReportConfig {
  appName: string;
  eventName: string;
  count?: number;
}

export function createCountReport({
  appName,
  eventName,
  count = 1,
}: CountReportConfig): CountReport {
  return { appName, eventName, type: 'count', stats: { sum: count } };
}

export interface LoadedReport extends StatsMetric<'sum'> {
  type: 'loaded';
}

export interface LoadedReportConfig {
  appName: string;
  eventName: string;
}

export function createLoadedReport({ appName, eventName }: LoadedReportConfig): LoadedReport {
  return { appName, eventName, type: 'loaded', stats: { sum: 1 } };
}
