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

const InboundWebhookReceivedEventSchema = lazySchema(() =>
  z.object({
    body: z.unknown().describe('Raw inbound JSON body. Filter with KQL on event.body.<path>.'),
  })
);

export const inboundWebhookReceived = {
  name: 'inboundWebhook.received' as const,
  title: i18n.translate('connectorTopics.inboundWebhook.received.title', {
    defaultMessage: 'Received',
  }),
  description: i18n.translate('connectorTopics.inboundWebhook.received.description', {
    defaultMessage: 'An HTTP payload was accepted on the ingest URL for this connector.',
  }),
  eventSchema: InboundWebhookReceivedEventSchema,
};
