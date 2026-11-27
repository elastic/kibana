/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { ConnectorEventTopicDefinition } from './connector_event_topic';

const DatadogAlertEventSchema = lazySchema(() =>
  z.object({
    body: z
      .object({
        message: z.unknown().optional(),
        last_updated: z.unknown().optional(),
        event_type: z.unknown().optional(),
        title: z.unknown().optional(),
        severity: z.unknown().optional(),
        alert_type: z.unknown().optional(),
        alert_query: z.unknown().optional(),
        alert_transition: z.unknown().optional(),
        date: z.unknown().optional(),
        scopes: z.unknown().optional(),
        org: z.unknown().optional(),
        url: z.unknown().optional(),
        tags: z.unknown().optional(),
        id: z.unknown().optional(),
        monitor_id: z.unknown().optional(),
      })
      .loose()
      .describe('Datadog webhook JSON body.'),
  })
);

export const datadogAlert = {
  name: 'datadog.alert',
  eventSchema: DatadogAlertEventSchema,
} as const satisfies ConnectorEventTopicDefinition;
