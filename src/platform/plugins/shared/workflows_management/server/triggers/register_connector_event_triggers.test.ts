/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorSpecHasEvents, connectorsSpecs } from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import {
  registerConnectorEventTriggers,
  toConnectorEventTriggerSchema,
} from './register_connector_event_triggers';

const createOutboundSpec = (): ConnectorSpec => ({
  metadata: {
    id: '.outbound',
    displayName: 'Outbound',
    description: 'No events',
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
});

const createDualSpec = (): ConnectorSpec => ({
  metadata: {
    id: '.dual',
    displayName: 'Dual',
    description: 'Steps and events',
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
  events: {
    definitions: {
      received: {
        eventId: 'dual.received',
        title: 'Dual received',
        description: 'A dual connector event',
        eventSchema: z.object({ body: z.unknown() }),
      },
    },
    handleEvents: async () => ({ type: 'emit', events: [] }),
  },
  test: { enabled: false, handler: async () => ({}) },
});

describe('registerConnectorEventTriggers', () => {
  it('does not register spec.events when inbound events are disabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggers({
      inboundEventsEnabled: false,
      registerTriggerDefinition,
      specs: [createDualSpec(), createOutboundSpec()],
    });

    expect(registerTriggerDefinition).not.toHaveBeenCalled();
  });

  it('does not register inboundWebhook.received from connector-specs when inbound events are disabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggers({
      inboundEventsEnabled: false,
      registerTriggerDefinition,
    });

    expect(registerTriggerDefinition).not.toHaveBeenCalled();
  });

  it('registers events from specs that declare them when inbound events are enabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggers({
      inboundEventsEnabled: true,
      registerTriggerDefinition,
      specs: [createDualSpec(), createOutboundSpec()],
    });

    expect(registerTriggerDefinition).toHaveBeenCalledTimes(1);
    expect(registerTriggerDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dual.received',
        title: 'Dual received',
        description: 'A dual connector event',
        stability: 'tech_preview',
        requiresConnectorId: true,
      })
    );
  });

  it('registers inboundWebhook.received from the connector-specs book', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggers({
      inboundEventsEnabled: true,
      registerTriggerDefinition,
    });

    const registered = registerTriggerDefinition.mock.calls.map(
      ([definition]: [ServerTriggerDefinition]) => definition.id
    );
    expect(registered).toContain('inboundWebhook.received');
    expect(registered).toHaveLength(
      Object.values(connectorsSpecs).filter(connectorSpecHasEvents).length
    );
  });
});

describe('toConnectorEventTriggerSchema', () => {
  const schema = toConnectorEventTriggerSchema(z.object({ body: z.unknown() }));

  it('accepts the bridge-enriched payload', () => {
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

  it('rejects a payload missing connector instance fields', () => {
    expect(schema.safeParse({ body: {} }).success).toBe(false);
  });
});
