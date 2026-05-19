/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
declare const applicationUsageReportSchema: import('@kbn/config-schema').ObjectType<{
  minutesOnScreen: import('@kbn/config-schema').Type<number>;
  numberOfClicks: import('@kbn/config-schema').Type<number>;
  appId: import('@kbn/config-schema').Type<string>;
  viewId: import('@kbn/config-schema').Type<string>;
}>;
export declare const reportSchema: import('@kbn/config-schema').ObjectType<{
  reportVersion: import('@kbn/config-schema').Type<3 | undefined>;
  userAgent: import('@kbn/config-schema').Type<
    | Record<
        string,
        Readonly<
          {} & {
            type: string;
            userAgent: string;
            key: string;
            appName: string;
          }
        >
      >
    | undefined
  >;
  uiCounter: import('@kbn/config-schema').Type<
    | Record<
        string,
        Readonly<
          {
            namespace?: string | undefined;
          } & {
            type: string;
            key: string;
            appName: string;
            eventName: string;
            total: number;
          }
        >
      >
    | undefined
  >;
  application_usage: import('@kbn/config-schema').Type<
    | Record<
        string,
        Readonly<
          {} & {
            minutesOnScreen: number;
            numberOfClicks: number;
            appId: string;
            viewId: string;
          }
        >
      >
    | undefined
  >;
}>;
export type ReportSchemaType = TypeOf<typeof reportSchema>;
export type ApplicationUsageReport = TypeOf<typeof applicationUsageReportSchema>;
export {};
