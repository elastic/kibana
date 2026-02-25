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
import type { ConnectorSpec } from '../../connector_spec';

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev';

export const Firecrawl: ConnectorSpec = {
  metadata: {
    id: '.firecrawl',
    displayName: 'Firecrawl',
    description: i18n.translate('core.kibanaConnectorSpecs.firecrawl.metadata.description', {
      defaultMessage: 'Scrape, search, map, and crawl the web via the Firecrawl API.',
    }),
    minimumLicense: 'basic',
    supportedFeatureIds: ['workflows'],
  },
  schema: z.object({}),
  actions: {},
  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.description', {
      defaultMessage: 'Verifies Firecrawl API key',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Firecrawl test handler');
      try {
        await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/scrape`, {
          url: 'https://example.com',
        });
        return {
          ok: true,
          message: i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.successMessage', {
            defaultMessage: 'Successfully connected to Firecrawl API',
          }),
        };
      } catch (error) {
        const err = error as { message?: string; response?: { status?: number; data?: unknown } };
        const status = err.response?.status;
        const message =
          status === 401
            ? i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.unauthorizedMessage', {
                defaultMessage: 'Invalid or missing API key',
              })
            : err.message ?? 'Unknown error';
        return {
          ok: false,
          message: i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.failureMessage', {
            defaultMessage: 'Failed to connect to Firecrawl API: {reason}',
            values: { reason: message },
          }),
        };
      }
    },
  },
};
