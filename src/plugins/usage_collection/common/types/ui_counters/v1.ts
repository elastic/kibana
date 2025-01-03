/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ui_counters query v1
 * @remarks
 */
export interface UiCountersRequestBody {
  report: {
    reportVersion?: 3;
    userAgent?: Record<
      string,
      Readonly<
        {} & {
          key: string;
          type: string;
          appName: string;
          userAgent: string;
        }
      >
    >;
    uiCounter?: Record<
      string,
      Readonly<
        {} & {
          key: string;
          type: string;
          appName: string;
          eventName: string;
          total: number;
        }
      >
    >;
    application_usage?: Record<
      string,
      Readonly<{
        minutesOnScreen: number;
        numberOfClicks: number;
        appId: string;
        viewId: string;
      }>
    >;
  };
}
/** explicit response type for store report success. The status value is hardcoded. */
export interface UiCountersResponseOk {
  status: 'ok';
}

/** explicit response type for store report fail. The status value is hardcoded. */
export interface UiCountersResponseFail {
  status: 'fail';
}
