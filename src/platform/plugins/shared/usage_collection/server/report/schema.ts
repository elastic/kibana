/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const applicationUsageReportSchema = schema.object({
  minutesOnScreen: schema.number(),
  numberOfClicks: schema.number(),
  // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
  appId: schema.string(),
  // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
  viewId: schema.string(),
});

export const reportSchema = schema.object({
  reportVersion: schema.maybe(schema.oneOf([schema.literal(3)])),
  userAgent: schema.maybe(
    schema.recordOf(
      // Client-supplied User-Agent record key; bounded generously to cover any real UA.
      schema.string({ maxLength: 2048 }),
      schema.object({
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        key: schema.string(),
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        type: schema.string(),
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        appName: schema.string(),
        // Client-supplied User-Agent header value; bounded generously to cover any real UA.
        userAgent: schema.string({ maxLength: 2048 }),
      })
    )
  ),
  uiCounter: schema.maybe(
    schema.recordOf(
      // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
      schema.string(),
      schema.object({
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        key: schema.string(),
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        type: schema.string(),
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        appName: schema.string(),
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        eventName: schema.string(),
        // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
        namespace: schema.maybe(schema.string()),
        total: schema.number(),
      })
    )
  ),
  // codeql[js/kibana/unbounded-string-in-schema] Kibana-generated telemetry value, not user input
  application_usage: schema.maybe(schema.recordOf(schema.string(), applicationUsageReportSchema)),
});

export type ReportSchemaType = TypeOf<typeof reportSchema>;
export type ApplicationUsageReport = TypeOf<typeof applicationUsageReportSchema>;
