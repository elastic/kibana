/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { METRIC_TYPE } from '@kbn/analytics';

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
        type: schema.oneOf([
          schema.literal<METRIC_TYPE>(METRIC_TYPE.CLICK),
          schema.literal<METRIC_TYPE>(METRIC_TYPE.LOADED),
          schema.literal<METRIC_TYPE>(METRIC_TYPE.COUNT),
        ]),
        appName: schema.string(),
        eventName: schema.string(),
        total: schema.number(),
      })
    )
  ),
  application_usage: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        minutesOnScreen: schema.number(),
        numberOfClicks: schema.number(),
        appId: schema.string(),
        viewId: schema.string(),
      })
    )
  ),
});

export type ReportSchemaType = TypeOf<typeof reportSchema>;
