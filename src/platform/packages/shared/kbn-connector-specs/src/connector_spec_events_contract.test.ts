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
import { buildEventId } from './event_type_id';

const createFakeSpecWithEvents = (overrides?: {
  metadataId?: string;
  eventId?: string;
}): ConnectorSpec & { events: NonNullable<ConnectorSpec['events']> } => {
  const metadataId = overrides?.metadataId ?? '.myConnector';
  const eventKey = 'received';
  return {
    metadata: {
      id: metadataId,
      displayName: 'My Connector',
      description: 'fake spec for contract predicates',
      minimumLicense: 'gold',
      supportedFeatureIds: ['workflows'],
    },
    actions: {},
    test: {
      enabled: false,
      handler: async () => ({}),
    },
    events: {
      definitions: {
        [eventKey]: {
          eventId: overrides?.eventId ?? buildEventId(metadataId, eventKey),
          title: 'Received',
          description: 'fake event',
          eventSchema: z.object({ body: z.unknown() }),
        },
      },
      handleEvents: async () => ({
        type: 'emit',
        events: [],
      }),
    },
  };
};

describe('connector spec events contract predicates', () => {
  it('rejects a hand-written eventId that does not match buildEventId', () => {
    const spec = createFakeSpecWithEvents({ eventId: 'wrong.namespace.received' });
    for (const [eventKey, def] of Object.entries(spec.events.definitions)) {
      expect(def.eventId).not.toBe(buildEventId(spec.metadata.id, eventKey));
    }
  });

  it('accepts eventId derived via buildEventId', () => {
    const spec = createFakeSpecWithEvents();
    for (const [eventKey, def] of Object.entries(spec.events.definitions)) {
      expect(def.eventId).toBe(buildEventId(spec.metadata.id, eventKey));
    }
  });
});
