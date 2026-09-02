/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from './connector_spec';
import { connectorSpecHasEvents, connectorTypeHasInboundEvents } from './connector_spec_has_events';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { Unifi } from './specs/unifi/unifi';
import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from './specs/inbound_webhook/constants';

const createSpec = (overrides: Partial<ConnectorSpec>): ConnectorSpec => ({
  metadata: {
    id: '.test',
    displayName: 'Test',
    description: 'Test',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },
  actions: {},
  test: { enabled: false, handler: async () => ({}) },
  ...overrides,
});

describe('connectorSpecHasEvents', () => {
  it('is true for inbound-only .inboundWebhook', () => {
    expect(connectorSpecHasEvents(InboundWebhook)).toBe(true);
  });

  it('is false for an outbound spec', () => {
    expect(connectorSpecHasEvents(Unifi)).toBe(false);
  });

  it('is true for a dual spec with actions and events', () => {
    const spec = createSpec({
      actions: {
        ping: {
          input: z.object({}),
          handler: async () => ({}),
          scope: 'read',
        },
      },
      events: {
        definitions: {
          received: {
            eventId: 'test.received',
            title: 'Received',
            description: 'Inbound',
            eventSchema: z.object({ body: z.unknown() }),
          },
        },
        handleEvents: async () => ({ type: 'emit', events: [] }),
      },
    });

    expect(connectorSpecHasEvents(spec)).toBe(true);
  });
});

describe('connectorTypeHasInboundEvents', () => {
  it('is true for .inboundWebhook', () => {
    expect(connectorTypeHasInboundEvents(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID)).toBe(true);
  });

  it('is false for outbound specs and unknown types', () => {
    expect(connectorTypeHasInboundEvents('.http')).toBe(false);
    expect(connectorTypeHasInboundEvents('my-connector-type')).toBe(false);
  });
});
