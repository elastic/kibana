/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/pagerduty/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// PagerDuty connector parameter schema
export const PagerDutyParamsSchema = z.object({
  eventAction: z.enum(['trigger', 'acknowledge', 'resolve']),
  dedupKey: z.string().optional(),
  summary: z.string().optional(),
  source: z.string().optional(),
  severity: z.enum(['critical', 'error', 'warning', 'info']).optional(),
  timestamp: z.string().optional(),
  component: z.string().optional(),
  group: z.string().optional(),
  class: z.string().optional(),
  customDetails: z.record(z.string(), z.any()).optional(),
  links: z
    .array(
      z.object({
        href: z.string(),
        text: z.string().optional(),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        src: z.string(),
        href: z.string().optional(),
        alt: z.string().optional(),
      })
    )
    .optional(),
});

// PagerDuty connector response schema
export const PagerDutyResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  dedup_key: z.string().optional(),
});
