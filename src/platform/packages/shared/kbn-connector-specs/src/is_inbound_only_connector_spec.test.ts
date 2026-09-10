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
import { isInboundOnlyConnectorSpec } from './is_inbound_only_connector_spec';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { Unifi } from './specs/unifi/unifi';

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

describe('isInboundOnlyConnectorSpec', () => {
  it('is true for .inboundWebhook', () => {
    expect(isInboundOnlyConnectorSpec(InboundWebhook)).toBe(true);
  });

  it('is false for an outbound spec', () => {
    expect(isInboundOnlyConnectorSpec(Unifi)).toBe(false);
  });

  it('is false for a dual spec with actions and events', () => {
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

    expect(isInboundOnlyConnectorSpec(spec)).toBe(false);
  });
});
