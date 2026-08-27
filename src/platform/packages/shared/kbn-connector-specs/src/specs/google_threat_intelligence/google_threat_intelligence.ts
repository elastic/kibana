/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import { GetFileBehavioursInputSchema, GetFileMitreAttackTechniquesInputSchema } from './types';
import type { GetFileBehavioursInput, GetFileMitreAttackTechniquesInput } from './types';

const GTI_API_BASE_URL = 'https://www.virustotal.com';
const GTI_HEADERS = { 'x-tool': 'Elastic' };

interface GtiErrorResponse {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

interface GtiIpReportResponse {
  data?: {
    attributes?: {
      gti_assessment?: unknown;
    };
  };
}

function throwGtiError(error: unknown): void {
  const { response } = error as GtiErrorResponse;
  const { code, message } = response?.data?.error ?? {};
  const detail = message ?? code;
  if (!detail) return;
  throw new Error(`GTI API error (${response?.status ?? 'unknown'}): ${detail}`);
}

export const GoogleThreatIntelligenceConnector: ConnectorSpec = {
  metadata: {
    id: '.google_threat_intelligence',
    displayName: 'Google Threat Intelligence',
    description: i18n.translate('connectorSpecs.googleThreatIntelligence.metadata.description', {
      defaultMessage:
        'Get file sandbox behavior reports and MITRE ATT&CK technique mappings from Google Threat Intelligence',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'x-apikey' },
        overrides: {
          meta: {
            'x-apikey': {
              placeholder: 'gti-...',
              helpText: i18n.translate(
                'connectorSpecs.googleThreatIntelligence.auth.apiKey.helpText',
                {
                  defaultMessage:
                    'The key must belong to an account with the GTI Enterprise subscription tier; ' +
                    'a key without that entitlement fails the Test connector check.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  actions: {
    getFileBehaviours: {
      isTool: true,
      description:
        'Get sandbox detonation reports for a file by hash (SHA-256, SHA-1, or MD5). Each report ' +
        'covers one sandbox run: process tree, files, registry keys and network activity it touched, ' +
        'plus the verdict. Returns up to 10 reports by default; use limit and cursor to page through ' +
        'more. Returns an empty collection when the hash is known to GTI but has not been sandboxed. ' +
        'Throws when GTI has no record of the hash at all.',
      input: GetFileBehavioursInputSchema,
      handler: async (ctx, input: GetFileBehavioursInput) => {
        try {
          const response = await ctx.client.get(
            `${GTI_API_BASE_URL}/api/v3/files/${encodeURIComponent(input.fileHash)}/behaviours`,
            { headers: GTI_HEADERS, params: { limit: input.limit, cursor: input.cursor } }
          );
          return response.data;
        } catch (error: unknown) {
          throwGtiError(error);
          throw error;
        }
      },
    },

    getFileMitreAttackTechniques: {
      isTool: true,
      description:
        'Get the MITRE ATT&CK tactics and techniques observed for a file by hash (SHA-256, SHA-1, or ' +
        'MD5), grouped by the sandbox that observed them. Each technique lists the signatures that ' +
        'triggered it and their severity. Throws when GTI has no record of the hash at all.',
      input: GetFileMitreAttackTechniquesInputSchema,
      handler: async (ctx, input: GetFileMitreAttackTechniquesInput) => {
        try {
          const response = await ctx.client.get(
            `${GTI_API_BASE_URL}/api/v3/files/${encodeURIComponent(
              input.fileHash
            )}/behaviour_mitre_trees`,
            { headers: GTI_HEADERS }
          );
          return response.data;
        } catch (error: unknown) {
          throwGtiError(error);
          throw error;
        }
      },
    },
  },

  skill: [
    '## Google Threat Intelligence connector',
    '',
    '## File sandbox behavior',
    '- `getFileBehaviours` supports paging: pass `limit` (0-40, defaults to 10) to bound the response ' +
      'size, and pass the `cursor` from a previous response to fetch the next page.',
    '',
    '## MITRE ATT&CK techniques',
    '- `getFileMitreAttackTechniques` groups tactics, techniques, and signatures by sandbox name, not ' +
      'as a flat list. The same file can show a different ATT&CK tree per sandbox it was detonated in.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.googleThreatIntelligence.test.description', {
      defaultMessage:
        'Verifies the API key and confirms your Google Threat Intelligence subscription tier',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get<GtiIpReportResponse>(
          `${GTI_API_BASE_URL}/api/v3/ip_addresses/8.8.8.8`,
          { headers: GTI_HEADERS }
        );
        const hasGtiAssessment = Boolean(response.data?.data?.attributes?.gti_assessment);
        if (!hasGtiAssessment) {
          throw new Error(
            'This API key does not have an Enterprise subscription. Use a key from an account ' +
              'with the GTI Enterprise subscription tier.'
          );
        }
        return {};
      } catch (error: unknown) {
        throwGtiError(error);
        throw error;
      }
    },
  },
};
