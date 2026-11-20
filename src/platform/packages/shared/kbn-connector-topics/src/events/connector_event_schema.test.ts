/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import { connectorEventSchema } from './connector_event_schema';
import { inboundWebhookReceived } from './inbound_webhook';

const spokeDescription = 'Raw inbound JSON body. Filter with KQL on event.body.<path>.';

describe('connectorEventSchema', () => {
  const schema = connectorEventSchema(inboundWebhookReceived.eventSchema);

  it('accepts the hub fields and the spoke payload', () => {
    expect(
      schema.safeParse({
        body: { eventType: 'order.created' },
        connectorId: 'sales-ingress',
        connectorTypeId: '.inboundWebhook',
        spaceId: 'default',
        correlationKey: 'corr-1',
      }).success
    ).toBe(true);
  });

  it('accepts a payload without the optional correlationKey', () => {
    expect(
      schema.safeParse({
        body: {},
        connectorId: 'sales-ingress',
        connectorTypeId: '.inboundWebhook',
        spaceId: 'default',
      }).success
    ).toBe(true);
  });

  it('rejects a payload missing the hub fields', () => {
    expect(schema.safeParse({ body: {} }).success).toBe(false);
  });

  it('keeps the spoke field description', () => {
    expect(schema.shape.body.description).toBe(spokeDescription);
    expect(inboundWebhookReceived.eventSchema.shape).not.toHaveProperty('connectorId');
  });

  it('keeps a described spoke field when the schema is built inline', () => {
    const extended = connectorEventSchema(
      z.object({
        text: z.string().describe('Message text.'),
      })
    );

    expect(extended.shape.text.description).toBe('Message text.');
    expect(extended.shape.connectorId.description).toBe(
      'Id of the connector instance that received this event.'
    );
  });
});
