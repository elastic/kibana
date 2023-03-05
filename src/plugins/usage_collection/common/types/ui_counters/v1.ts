/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * ui_counters query v1
 * @remarks
 */
export interface UiCountersHTTPRequestBody {
  report: {
    reportVersion?: 3;
    userAgent?: {
      key: string;
      type: string;
      appName: string;
      userAgent: string;
    };
    uiCounter?: {
      key: string;
      type: string;
      appName: string;
      eventName: string;
      total: number;
    };
    application_usage?: {
      minutesOnScreen: number;
      numberOfClicks: number;
      appId: string;
      viewId: string;
    };
  };
}
