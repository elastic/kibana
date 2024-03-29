/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

const applicationUsageReportSchema = schema.object({
  minutesOnScreen: schema.number(),
  numberOfClicks: schema.number(),
  appId: schema.string(),
  viewId: schema.string(),
});

export const reportSchema = schema.object({
  reportVersion: schema.maybe(schema.oneOf([schema.literal(3)])),
  userAgent: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        key: schema.string(),
        type: schema.string(),
        appName: schema.string(),
        userAgent: schema.string(),
      })
    )
  ),
  uiCounter: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        key: schema.string(),
        type: schema.string(),
        appName: schema.string(),
        eventName: schema.string(),
        total: schema.number(),
      })
    )
  ),
  application_usage: schema.maybe(schema.recordOf(schema.string(), applicationUsageReportSchema)),
});

export type ReportSchemaType = TypeOf<typeof reportSchema>;
export type ApplicationUsageReport = TypeOf<typeof applicationUsageReportSchema>;
