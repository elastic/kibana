/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs-common';
import { z } from '@kbn/zod/v4';
import { getConnectorTypeIdForTriggerEventId } from './connector_event_triggers';
import { applyConnectorSpecsCatalog, resetConnectorSpecsCatalog } from '../connector_specs_catalog';

describe('getConnectorTypeIdForTriggerEventId', () => {
  beforeEach(() => {
    applyConnectorSpecsCatalog([
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
    ]);
  });

  afterEach(() => {
    resetConnectorSpecsCatalog();
  });

  it('maps inboundWebhook.received to .inboundWebhook', () => {
    expect(getConnectorTypeIdForTriggerEventId('inboundWebhook.received')).toBe(
      INBOUND_WEBHOOK_CONNECTOR_TYPE_ID
    );
  });

  it('returns undefined for built-in or unregistered trigger ids', () => {
    expect(getConnectorTypeIdForTriggerEventId('cases.updated')).toBeUndefined();
    expect(getConnectorTypeIdForTriggerEventId('manual')).toBeUndefined();
  });
});
