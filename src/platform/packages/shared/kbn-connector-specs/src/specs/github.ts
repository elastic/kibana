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
import type { ConnectorSpec } from '../connector_spec';

export const GithubConnector: ConnectorSpec = {
  metadata: {
    id: '.github',
    displayName: 'Github',
    description: i18n.translate('core.kibanaConnectorSpecs.github.metadata.description', {
      defaultMessage: 'Search through repositories and issues in Github',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer'],
    headers: {
      'Notion-Version': '2025-09-03',
    },
  },

  actions: {

    
  },

  test: {
    description: i18n.translate('ore.kibanaConnectorSpecs.github.test.description', {
      defaultMessage: 'Verifies Github connection by fetching metadata about given data source',
    }),
    // TODO: might need to accept some input here in order to pass to the API endpoint to test
    // if listing all users feels a bit too much
    handler: async (ctx) => {
      ctx.log.debug('Notion test handler');

      try {
        const response = await ctx.client.get('https://api.notion.com/v1/users');
        const numOfUsers = response.data.results.length;
        return {
          ok: true,
          message: `Successfully connected to Notion API: found ${numOfUsers} users`,
        };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  },
};