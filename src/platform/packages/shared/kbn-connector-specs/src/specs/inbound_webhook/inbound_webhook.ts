/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import type { ConnectorSpec } from '../../connector_spec';
import type { ConnectorIngressContext, HandleEventsResult } from '../../connector_spec_events';
import {
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  INBOUND_WEBHOOK_RECEIVED_EVENT_ID,
  INBOUND_WEBHOOK_RECEIVED_EVENT_KEY,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
} from './constants';
import { InboundWebhookReceivedEventSchema } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Generic POST handshake: top-level string `challenge` (sibling keys ignored).
 * Echo `{ challenge }` and skip emit. Nested `payload.challenge` is not a handshake.
 */
const getHandshakeChallenge = (rawBody: unknown): string | undefined => {
  if (!isPlainObject(rawBody)) {
    return undefined;
  }
  const { challenge } = rawBody;
  if (typeof challenge !== 'string' || challenge.length === 0) {
    return undefined;
  }
  if (challenge.length > MAX_HANDSHAKE_CHALLENGE_LENGTH) {
    return undefined;
  }
  return challenge;
};

const handleInboundWebhookEvents = async (
  ctx: ConnectorIngressContext
): Promise<HandleEventsResult> => {
  const challenge = getHandshakeChallenge(ctx.rawBody);
  if (challenge !== undefined) {
    return {
      type: 'http',
      httpResponse: {
        status: 200,
        body: { challenge },
      },
    };
  }

  const correlationKey = uuidv4();

  return {
    type: 'emit',
    events: [
      {
        eventId: INBOUND_WEBHOOK_RECEIVED_EVENT_ID,
        correlationKey,
        payload: {
          body: ctx.rawBody,
        },
      },
    ],
  };
};

export const InboundWebhook: ConnectorSpec = {
  metadata: {
    id: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
    displayName: i18n.translate('core.kibanaConnectorSpecs.inboundWebhook.metadata.displayName', {
      defaultMessage: 'Inbound Webhook',
    }),
    description: i18n.translate('core.kibanaConnectorSpecs.inboundWebhook.metadata.description', {
      defaultMessage: 'Receive HTTP events into Kibana workflows via a public ingest URL.',
    }),
    icon: 'plugs',
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows'],
    docsUrl: '',
  },

  auth: {
    types: ['none'],
  },

  // ingestTokenHash is factory-injected for every spec with events.
  schema: z.object({}),

  actions: {},

  test: {
    enabled: false,
    handler: async () => ({}),
  },

  events: {
    definitions: {
      [INBOUND_WEBHOOK_RECEIVED_EVENT_KEY]: {
        eventId: INBOUND_WEBHOOK_RECEIVED_EVENT_ID,
        title: i18n.translate('core.kibanaConnectorSpecs.inboundWebhook.events.received.title', {
          defaultMessage: 'Received',
        }),
        description: i18n.translate(
          'core.kibanaConnectorSpecs.inboundWebhook.events.received.description',
          {
            defaultMessage: 'An HTTP payload was accepted on the ingest URL for this connector.',
          }
        ),
        eventSchema: InboundWebhookReceivedEventSchema,
      },
    },
    handleEvents: handleInboundWebhookEvents,
  },
};
