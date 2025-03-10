/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ApplicationViewUsage {
  appId: string;
  viewId: string;
  clicks_total: number;
  clicks_7_days: number;
  clicks_30_days: number;
  clicks_90_days: number;
  minutes_on_screen_total: number;
  minutes_on_screen_7_days: number;
  minutes_on_screen_30_days: number;
  minutes_on_screen_90_days: number;
}

export interface ApplicationUsageViews {
  [serializedKey: string]: ApplicationViewUsage;
}

export interface ApplicationUsageTelemetryReport {
  [appId: string]: {
    appId: string;
    viewId: string;
    clicks_total: number;
    clicks_7_days: number;
    clicks_30_days: number;
    clicks_90_days: number;
    minutes_on_screen_total: number;
    minutes_on_screen_7_days: number;
    minutes_on_screen_30_days: number;
    minutes_on_screen_90_days: number;
    views?: ApplicationViewUsage[];
  };
}
