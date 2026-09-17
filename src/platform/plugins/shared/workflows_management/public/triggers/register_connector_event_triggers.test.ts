/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs-common';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';
import { registerConnectorEventTriggersPublic } from './register_connector_event_triggers';
import type { RehydratedConnectorSpecCatalogEntry } from '../../common/connector_specs_catalog';

const inboundWebhookCatalog: RehydratedConnectorSpecCatalogEntry[] = [
  {
    id: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
    isInboundOnly: true,
    actions: {},
    events: {
      definitions: [
        {
          eventId: 'inboundWebhook.received',
          title: 'Received',
          description: 'Inbound payload',
          eventSchema: z.object({ body: z.unknown() }),
        },
      ],
    },
  },
];

describe('registerConnectorEventTriggersPublic', () => {
  it('does not register inboundWebhook.received when inbound events are disabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggersPublic({
      inboundEventsEnabled: false,
      registerTriggerDefinition,
      specs: inboundWebhookCatalog,
    });

    expect(registerTriggerDefinition).not.toHaveBeenCalled();
  });

  it('registers inboundWebhook.received when inbound events are enabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggersPublic({
      inboundEventsEnabled: true,
      registerTriggerDefinition,
      specs: inboundWebhookCatalog,
    });

    const registered = registerTriggerDefinition.mock.calls.map(
      ([definition]: [PublicTriggerDefinition]) => definition.id
    );
    expect(registered).toContain('inboundWebhook.received');
    expect(registerTriggerDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inboundWebhook.received',
        stability: 'tech_preview',
        requiresConnectorId: true,
        icon: expect.anything(),
      })
    );
  });
});
