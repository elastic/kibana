/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { jobsSelectionSchema } from '../common/utils';

export const anomalyDetectionJobsHealthRuleParamsSchema = schema.object({
  includeJobs: jobsSelectionSchema,
  excludeJobs: schema.nullable(jobsSelectionSchema),
  testsConfig: schema.nullable(
    schema.object({
      datafeed: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
      mml: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
      delayedData: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
          docsCount: schema.nullable(schema.number({ min: 1 })),
          timeInterval: schema.nullable(schema.string()),
        })
      ),
      behindRealtime: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
          timeInterval: schema.nullable(schema.string()),
        })
      ),
      errorMessages: schema.nullable(
        schema.object({
          enabled: schema.boolean({ defaultValue: true }),
        })
      ),
    })
  ),
});
