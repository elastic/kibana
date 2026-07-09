/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';

export const Trello: ConnectorSpec = {
  metadata: {
    id: '.trello',
    displayName: 'Trello',
    description: i18n.translate('connectorSpecs.trello.metadata.description', {
      defaultMessage: 'Access boards, lists, and cards in Trello',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_query',
        defaults: { paramNames: ['key', 'token'] },
        overrides: {
          meta: {
            key: { label: 'API key' },
            token: { label: 'API token' },
          },
        },
      },
    ],
  },

  actions: {
    // Placeholder action so the connector can be registered and invoked from
    // chat. Makes no Trello API calls. Replace with real board/list/card
    // actions in a follow-up.
    status: {
      isTool: true,
      description:
        'Placeholder for the Trello connector. Returns a static status message and does not call the Trello API. Real actions are not implemented yet.',
      input: lazySchema(() => z.object({})),
      handler: async () => ({
        ok: true,
        message: 'The Trello connector is scaffolded but has no operational actions yet.',
      }),
    },
  },

  test: {
    handler: async () => ({
      ok: true,
      message: 'Trello connector configured (no live validation yet)',
    }),
  },
};
