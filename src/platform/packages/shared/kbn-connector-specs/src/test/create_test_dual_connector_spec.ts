/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';

/** Builds a minimal dual connector spec (one action, one event) for tests. */
export const createTestDualConnectorSpec = (
  overrides: Partial<ConnectorSpec> = {}
): ConnectorSpec => ({
  metadata: {
    id: '.test',
    displayName: 'Test',
    description: 'Test',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },
  actions: {
    ping: {
      input: z.object({}),
      handler: async () => ({}),
      scope: 'read',
    },
  },
  test: { enabled: false, handler: async () => ({}) },
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
  ...overrides,
});
