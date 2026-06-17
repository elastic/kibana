/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TAXII 2.1 connector — credentialed transport for STIX bundles.
 *
 * Why this lives in `kbn-connector-specs`:
 *  - TAXII servers are operator-managed external services (think Anomali,
 *    LimoDC, vendor-specific TAXII roots) that ship credentialed
 *    collections. The Connectors framework already handles the operator
 *    UX (Add Connector → enter URL + auth → Test), encrypted secrets, and
 *    `xpack.actions.allowedHosts` validation. Hand-rolling those for a
 *    threat-intelligence-only adapter would duplicate platform code.
 *
 *  - The threat-intelligence source-ingestion workflow's `taxii_adapter`
 *    invokes this connector via `actionsClient.execute({ subAction:
 *    'pollCollection', subActionParams: { collectionUrl } })` when the
 *    source's `config.connector_id` is set. Anonymous TAXII feeds keep
 *    using the adapter's direct `fetchUrl` path — both code paths land
 *    on the same `splitStixBundle` + normalize-to-`.kibana-threat-reports`
 *    pipeline.
 *
 *  - Beyond ingestion, `pollCollection` is exposed as an Agent Builder
 *    tool (`isTool: true`) so analysts can ask "pull the latest from
 *    <collection>" interactively without scheduling a workflow.
 *
 * Scope notes:
 *  - `pollCollection` returns the raw TAXII envelope shape (`objects`,
 *    `more`, `next`). It does NOT split STIX bundles or normalize to
 *    threat-report documents — those are the caller's responsibility,
 *    so this connector stays generic enough for non-threat-intel use
 *    cases (e.g. an analyst who wants the raw STIX for inspection).
 *  - Pagination is exposed declaratively via `policies.pagination` and
 *    via the action's `next` input, but the action itself returns one
 *    page per call. Callers loop on `more === true` if they need every
 *    page in a single shot.
 *  - mTLS / client-cert auth is not yet supported; that requires the
 *    framework's Phase-2 auth types (see `connector_rfc.ts`).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { RETRY_TIMEOUT_AND_RATE_LIMIT } from '../../connector_spec';

const TAXII_ACCEPT = 'application/taxii+json;version=2.1, application/json';

const buildObjectsUrl = (collectionUrl: string): string => {
  const trimmed = collectionUrl.replace(/\/?$/, '/');
  return trimmed.endsWith('/objects/') ? trimmed : `${trimmed}objects/`;
};

const readServerUrl = (ctx: ActionContext): string => {
  const value = ctx.config?.serverUrl;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('TAXII connector is missing required `serverUrl` config');
  }
  return value;
};

interface TaxiiEnvelope {
  objects?: unknown[];
  more?: boolean;
  next?: string;
}

const isTaxiiEnvelope = (value: unknown): value is TaxiiEnvelope =>
  typeof value === 'object' && value !== null;

export const TaxiiConnector: ConnectorSpec = {
  metadata: {
    id: '.taxii',
    displayName: 'TAXII 2.1',
    description: i18n.translate('connectorSpecs.taxii.metadata.description', {
      defaultMessage:
        'Poll TAXII 2.1 collections for STIX threat-intelligence bundles, with credentialed access to vendor and community feeds',
    }),
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: z
        .url()
        .describe(
          'TAXII 2.1 root / discovery URL — used by the connector test and as the host scope'
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.taxii.config.serverUrl.label', {
            defaultMessage: 'TAXII server URL',
          }),
          placeholder: 'https://taxii.example.com/api/v1/taxii2/',
          helpText: i18n.translate('connectorSpecs.taxii.config.serverUrl.helpText', {
            defaultMessage:
              'TAXII 2.1 root or discovery URL (e.g. `https://taxii.example.com/api/v1/taxii2/`). Per-action collection URLs are validated against this host.',
          }),
        }),
    })
  ),

  auth: {
    types: [
      { type: 'basic', defaults: {} },
      { type: 'bearer', defaults: {} },
      { type: 'api_key_header', defaults: { headerField: 'X-Api-Key' } },
    ],
  },

  policies: {
    retry: {
      retryOnStatusCodes: [...RETRY_TIMEOUT_AND_RATE_LIMIT],
      maxRetries: 3,
      backoffStrategy: 'exponential',
    },
    /**
     * TAXII 2.1's pagination is cursor-based: each response carries
     * `more: true` + `next: "<opaque>"`. Surfacing the policy
     * declaratively lets workflow authors and the connector UI
     * understand the shape; the `pollCollection` action accepts the
     * cursor as `next` input so callers drive the loop themselves.
     */
    pagination: {
      strategy: 'cursor',
      cursorParam: 'next',
      resultPath: 'objects',
    },
  },

  actions: {
    discovery: {
      isTool: true,
      description:
        'Fetch the TAXII 2.1 server discovery document (api-roots and contact info). Use to enumerate available API roots before listing collections.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        const serverUrl = readServerUrl(ctx);
        const response = await ctx.client.get(serverUrl, {
          headers: { Accept: TAXII_ACCEPT },
        });
        return response.data;
      },
    },

    getCollectionMetadata: {
      isTool: true,
      description:
        'Fetch metadata for a single TAXII 2.1 collection (title, description, can_read, media_types). Useful for verifying access before polling.',
      input: lazySchema(() =>
        z.object({
          collectionUrl: z
            .url()
            .describe(
              'Absolute TAXII 2.1 collection URL, e.g. `https://taxii.example.com/api/v1/collections/<id>/`'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { collectionUrl: string };
        const url = typedInput.collectionUrl.replace(/\/?$/, '/');
        const response = await ctx.client.get(url, {
          headers: { Accept: TAXII_ACCEPT },
        });
        return response.data;
      },
    },

    pollCollection: {
      isTool: true,
      description:
        'Poll a TAXII 2.1 collection objects endpoint for STIX SDOs. Returns one page (`objects`, `more`, `next`); callers loop on `more === true`. Supports the `added_after` server-side filter for cursor-based incremental polling.',
      input: lazySchema(() =>
        z.object({
          collectionUrl: z
            .url()
            .describe(
              'Absolute TAXII 2.1 collection URL. The connector appends `objects/` if not already present.'
            ),
          addedAfter: z
            .string()
            .optional()
            .describe(
              'ISO-8601 timestamp (e.g. `2026-01-01T00:00:00Z`). When set, the server returns only objects added after this point (TAXII `added_after` query param).'
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(10_000)
            .optional()
            .describe('Per-page object cap (server-side `limit`). Most servers default to 100.'),
          next: z
            .string()
            .min(1)
            .optional()
            .describe(
              'Opaque cursor returned by a prior `pollCollection` call when `more === true`.'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          collectionUrl: string;
          addedAfter?: string;
          limit?: number;
          next?: string;
        };
        const url = new URL(buildObjectsUrl(typedInput.collectionUrl));
        if (typedInput.addedAfter) url.searchParams.set('added_after', typedInput.addedAfter);
        if (typedInput.limit !== undefined) url.searchParams.set('limit', String(typedInput.limit));
        if (typedInput.next) url.searchParams.set('next', typedInput.next);

        const response = await ctx.client.get(url.toString(), {
          headers: { Accept: TAXII_ACCEPT },
        });
        const envelope = isTaxiiEnvelope(response.data) ? response.data : {};
        return {
          objects: Array.isArray(envelope.objects) ? envelope.objects : [],
          more: Boolean(envelope.more),
          next: typeof envelope.next === 'string' ? envelope.next : undefined,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        const serverUrl = readServerUrl(ctx);
        await ctx.client.get(serverUrl, {
          headers: { Accept: TAXII_ACCEPT },
        });
        return {
          ok: true,
          message: i18n.translate('connectorSpecs.taxii.test.ok', {
            defaultMessage: 'TAXII server is reachable',
          }),
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    description: i18n.translate('connectorSpecs.taxii.test.description', {
      defaultMessage: 'Verifies the TAXII server URL is reachable with the configured credentials',
    }),
  },
};
