/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod/v4';

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
  name: 'datadog.alert' as const,
  title: i18n.translate('connectorTopics.datadog.alert.title', {
    defaultMessage: 'Alert',
  }),
  description: i18n.translate('connectorTopics.datadog.alert.description', {
    defaultMessage: 'A Datadog alert webhook payload was accepted on the connector ingest URL.',
  }),
  eventSchema: DatadogAlertEventSchema,
};
