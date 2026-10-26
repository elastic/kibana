/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from './constants';
import { inboundWebhookEvents } from './events';

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
  schema: lazySchema(() => z.object({})),

  actions: {},

  test: {
    enabled: false,
    handler: async () => ({}),
  },

  events: inboundWebhookEvents,
};
