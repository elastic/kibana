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
import { setConnectorActionErrorMeta, getConnectorActionErrorMeta } from '../../connector_utils';
import type { ConnectorSpec } from '../../connector_spec';
import type { ReadDocInput, UpdateDocInput } from './types';
import { ReadDocInputSchema, UpdateDocInputSchema } from './types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DOCS_API_BASE = 'https://docs.googleapis.com/v1';
const GOOGLE_DOCS_MIME_TYPE = 'application/vnd.google-apps.document';
const SCOPES =
  'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents';

function throwGoogleDocsError(error: unknown): never {
  const axiosError = error as {
    response?: { data?: { error?: { message?: string; code?: number } } };
  };
  const googleError = axiosError.response?.data?.error;
  if (googleError) {
    const code = googleError.code ?? 'unknown';
    const message = googleError.message
      ? `Google Docs API error (${code}): ${googleError.message}`
      : `Google Docs API error (${code})`;
    const newError = new Error(message);
    const meta = getConnectorActionErrorMeta(error);
    if (meta) {
      setConnectorActionErrorMeta(newError, meta);
    }
    throw newError;
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(String(error));
}

export const GoogleDocsConnector: ConnectorSpec = {
  metadata: {
    id: '.google_docs',
    displayName: 'Google Docs',
    description: i18n.translate('core.kibanaConnectorSpecs.googleDocs.metadata.description', {
      defaultMessage: 'Read and update documents in Google Docs',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. A follow-up PR will add 'workflows' and 'contextEngine'
    // once this connector is registered in every Production-NonCanary version.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      // EARS is commented out until EARS supports write scopes. The `documents` scope
      // required by updateDoc is a write scope; EARS currently only supports read-only
      // Google scopes (drive.readonly, gmail.readonly, etc.). Re-enable once EARS adds
      // write scope support for Google connectors.
      // {
      //   type: 'ears',
      //   isRecommended: true,
      //   isExperimental: true,
      //   overrides: {
      //     meta: { scope: { disabled: true } },
      //   },
      //   defaults: {
      //     provider: 'google',
      //     scope: SCOPES,
      //   },
      // },
      {
        type: 'oauth_authorization_code',
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scope: SCOPES,
        },
      },
    ],
  },

  schema: lazySchema(() => z.object({})),

  actions: {
    readDoc: {
      isTool: true,
      scope: 'read',
      description:
        'Read the full content of a Google Doc as Markdown. ' +
        'Returns the document title, Markdown content, total character count, and a web link. ' +
        'For documents longer than max_characters, the response includes truncated: true and next_offset — ' +
        'call readDoc again with offset: next_offset to fetch the next page. ' +
        'Note: the entire document export is fetched before slicing; if the Markdown export exceeds ' +
        'the Actions response size limit the request will fail regardless of max_characters. ' +
        'Use document IDs from search results, shared links, or URLs in the form ' +
        'docs.google.com/document/d/{document_id}/edit.',
      input: ReadDocInputSchema,
      handler: async (ctx, input: ReadDocInput) => {
        const { document_id, max_characters, offset } = input;
        const encodedId = encodeURIComponent(document_id);

        let title: string;
        let webViewLink: string | undefined;
        try {
          const metaResponse = await ctx.client.get(`${DRIVE_API_BASE}/files/${encodedId}`, {
            params: { fields: 'id,name,mimeType,webViewLink', supportsAllDrives: true },
          });
          const meta = metaResponse.data as {
            name: string;
            mimeType: string;
            webViewLink?: string;
          };
          if (meta.mimeType !== GOOGLE_DOCS_MIME_TYPE) {
            throw new Error(
              `File is not a Google Doc (mimeType: ${meta.mimeType}). ` +
                'Use the Google Drive connector to access other file types.'
            );
          }
          title = meta.name;
          webViewLink = meta.webViewLink;
        } catch (error: unknown) {
          throwGoogleDocsError(error);
        }

        let content: string;
        try {
          const exportResponse = await ctx.client.get(
            `${DRIVE_API_BASE}/files/${encodedId}/export`,
            {
              params: { mimeType: 'text/markdown' },
              responseType: 'text',
            }
          );
          content = exportResponse.data as string;
        } catch (error: unknown) {
          throwGoogleDocsError(error);
        }

        const codePoints = [...content];
        const totalCharacters = codePoints.length;

        if (offset > 0 && offset >= totalCharacters) {
          throw new Error(
            `Offset ${offset} is past the end of the document (${totalCharacters} characters total). ` +
              'Pass offset: 0 or a next_offset value from a previous response.'
          );
        }

        const slice = codePoints.slice(offset, offset + max_characters).join('');
        const truncated = offset + max_characters < totalCharacters;

        return {
          document_id,
          title,
          content: slice,
          offset,
          ...(truncated ? { next_offset: offset + max_characters } : {}),
          total_characters: totalCharacters,
          truncated,
          ...(webViewLink ? { web_view_link: webViewLink } : {}),
        };
      },
    },

    updateDoc: {
      isTool: true,
      scope: 'destroy',
      description:
        'Apply one or more batch updates to a Google Doc using the Google Docs batchUpdate API. ' +
        'Supports replacing text (replaceAllText), applying text and paragraph styles, managing bullet lists, ' +
        'inserting and deleting tables and table rows, inserting inline images, and managing named ranges. ' +
        'Each request in the array must contain exactly one operation key. ' +
        'Multiple requests are applied atomically in order. ' +
        'Use replaceAllText for all text replacement — it requires no index arithmetic and is the safest approach.',
      input: UpdateDocInputSchema,
      handler: async (ctx, input: UpdateDocInput) => {
        const { document_id, requests } = input;
        const encodedId = encodeURIComponent(document_id);

        try {
          const response = await ctx.client.post(
            `${DOCS_API_BASE}/documents/${encodedId}:batchUpdate`,
            { requests }
          );
          return response.data;
        } catch (error: unknown) {
          throwGoogleDocsError(error);
        }
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.googleDocs.test.description', {
      defaultMessage: 'Verifies connection to the Google Docs API',
    }),
    handler: async (ctx) => {
      try {
        await ctx.client.get(`${DRIVE_API_BASE}/about`, {
          params: { fields: 'user' },
        });
      } catch (error: unknown) {
        throwGoogleDocsError(error);
      }

      // Verify the Docs API is enabled and the documents scope is present. A 404 (document
      // not found) is the expected response for a nonexistent ID and confirms access; any
      // other error (403 missing scope, 403 API not enabled, network error) is a real failure.
      // The ID is a valid-format alphanumeric string that will not exist in any real Drive.
      try {
        await ctx.client.get(
          `${DOCS_API_BASE}/documents/KibanaConnectivityCheckAAAAAAAAAAAAAAAAAAAA`
        );
      } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { error?: { code?: number } } } };
        if (axiosError.response?.data?.error?.code !== 404) {
          throwGoogleDocsError(error);
        }
      }

      return {};
    },
    enabled: true,
  },

  skill: [
    'Google Docs connector — usage guidance for LLMs',
    '',
    '## Finding documents: use the Google Drive connector first',
    'This connector requires a document_id to call readDoc or updateDoc. It has no search or list',
    'capability of its own. To discover documents, use the Google Drive connector:',
    "  - searchFiles: find docs by content, name, owner, or date (add mimeType = 'application/vnd.google-apps.document')",
    "  - listFiles: browse a folder's contents",
    '  - getFileMetadata: get title, owner, sharing, timestamps for a known ID',
    'The document_id is the long alphanumeric string in the URL:',
    '  docs.google.com/document/d/{document_id}/edit',
    '',
    '## Reading long documents',
    'readDoc returns content as Markdown. For documents longer than max_characters (default 100,000),',
    'the response includes truncated: true and next_offset. Call readDoc again with offset: next_offset',
    'to fetch the next page. Continue until truncated is false.',
    '',
    '## Updating documents: replaceAllText is safest',
    'When the goal is to replace a known phrase throughout the document, use replaceAllText.',
    'It requires no index arithmetic and is immune to stale-index bugs from concurrent edits.',
    '',
    '## Anatomy of a batchUpdate request',
    'Each entry in the requests array is a single-key object. The key names the operation; its',
    'value is the operation parameters. Example:',
    '  {"replaceAllText": {"containsText": {"text": "old phrase"}, "replaceText": "new phrase"}}',
  ].join('\n'),
};
