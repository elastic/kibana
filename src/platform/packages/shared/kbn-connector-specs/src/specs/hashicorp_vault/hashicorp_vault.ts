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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { validateVaultAddress, encodeVaultPathSegments } from './path_utils';

const VAULT_NAMESPACE_HEADER = 'X-Vault-Namespace';
// The field name in the generated secrets schema, once `api_key_header`'s
// `normalizeSchema` collapses `headerField`/`apiKey` into a single field keyed by
// the header name itself. Sending this header on every request is exactly Vault's
// "Token auth method" (https://developer.hashicorp.com/vault/docs/auth/token).
const VAULT_TOKEN_FIELD = 'X-Vault-Token';

interface HashicorpVaultConfig {
  address: string;
  namespace?: string;
}

const getRequestHeaders = (config: HashicorpVaultConfig): Record<string, string> | undefined =>
  config.namespace ? { [VAULT_NAMESPACE_HEADER]: config.namespace } : undefined;

const getVaultErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/**
 * Converts a Vault KV v2 field value to the connector's scalar-only output shape.
 * Deliberately does NOT stringify objects/arrays (e.g. via `JSON.stringify`), since
 * that could silently produce a plausible-looking but wrong credential string;
 * unsupported shapes are rejected with a name-only (never value-including) error.
 */
const toSafeStringValue = (fieldName: string, value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new Error(
    `Vault field '${fieldName}' has an unsupported type (object/array); only string, number, or boolean Vault fields are supported.`
  );
};

// Vault KV v2 read response shape: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2#read-secret-version
const VaultKvV2ResponseSchema = lazySchema(() =>
  z.object({
    data: z.object({
      data: z.record(z.string(), z.unknown()),
    }),
  })
);

const ReadSecretInputSchema = lazySchema(() =>
  z.object({
    path: z.string().min(1).max(1024),
    field: z.string().min(1).max(256).optional(),
  })
);

export const HashicorpVaultConnector: ConnectorSpec = {
  metadata: {
    id: '.hashicorp_vault',
    displayName: 'HashiCorp Vault',
    description: i18n.translate('core.kibanaConnectorSpecs.hashicorpVault.metadata.description', {
      defaultMessage: 'Read secrets from a HashiCorp Vault KV v2 secrets engine.',
    }),
    minimumLicense: 'enterprise',
    // Deliberately does not include 'workflows' yet: `readSecret` is not `isTool`
    // and must not be reachable via Agent Builder either way, and a generic,
    // YAML-authored Workflow connector step is not the intended access path for
    // this connector (the `connector_provisioning` step calls `actionsClient
    // .execute()` directly by connector ID, bypassing the feature-scoped
    // picker/schema entirely -- see the connector-provisioning plan §3).
    supportedFeatureIds: ['agentBuilder'],
    docsUrl: `https://www.elastic.co/docs/reference/kibana/connectors-kibana/hashicorp-vault-action-type`,
  },

  auth: {
    types: [
      {
        // Vault's "Token auth method": a single caller-supplied token sent as the
        // `X-Vault-Token` header on every request. Reusing `api_key_header` with a
        // fixed, hidden `headerField` default means the generated secrets field is
        // named after the actual header (`X-Vault-Token`) rather than a generic
        // `apiKey`, and `api_key_header`'s `configure()` already sets exactly that
        // header from the field's value -- no custom auth type needed.
        type: 'api_key_header',
        defaults: { headerField: VAULT_TOKEN_FIELD },
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.hashicorpVault.auth.token.label', {
            defaultMessage: 'Vault token',
          }),
          meta: {
            [VAULT_TOKEN_FIELD]: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.hashicorpVault.auth.token.field.label',
                { defaultMessage: 'Vault token' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.hashicorpVault.auth.token.field.helpText',
                {
                  defaultMessage:
                    'A Vault token with read access to the secrets this connector will fetch. Its lifetime and renewal are governed entirely by Vault; if it is not a periodic/renewable token, or is not kept alive by an external process, requests will eventually fail with a 403 once it expires.',
                }
              ),
            },
          },
        },
      },
      // Vault's "AppRole auth method": a `roleId`/`secretId` pair, exchanged for a
      // short-lived Vault token via a login request, with re-login handled
      // transparently by the shared getToken()/connectorTokenClient caching
      // infrastructure (see `vault_approle_server.ts`). Suited to unattended,
      // machine-to-machine use (Phase 3 of the connector-provisioning plan).
      'vault_approle',
    ],
  },

  schema: lazySchema(() =>
    z.object({
      address: z
        .url()
        .max(2048)
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.hashicorpVault.config.address.label', {
            defaultMessage: 'Vault address',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.hashicorpVault.config.address.helpText',
            {
              defaultMessage:
                'The base URL of your Vault server, e.g. https://vault.example.com:8200. Must be https, with no path, query string, or embedded credentials.',
            }
          ),
          widget: 'text',
          placeholder: 'https://vault.example.com:8200',
          validate: { allowedHosts: true },
        }),
      namespace: z
        .string()
        .max(256)
        .optional()
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.hashicorpVault.config.namespace.label', {
            defaultMessage: 'Vault namespace',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.hashicorpVault.config.namespace.helpText',
            {
              defaultMessage:
                'Optional. Vault Enterprise namespace to scope requests to (sent as the X-Vault-Namespace header). Leave empty if you do not use Vault namespaces.',
            }
          ),
        }),
    })
  ),

  actions: {
    readSecret: {
      // Deliberately NOT `isTool: true`: this action's whole purpose is to return
      // raw credential material, and Agent Builder's tool-execution code rejects
      // any sub-action not marked `isTool: true` before calling `execute()` at all
      // -- so this is a structural (not just a redaction-based) barrier to the LLM
      // ever seeing a raw secret through this connector.
      isTool: false,
      sensitiveOutput: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.hashicorpVault.actions.readSecret.description',
        {
          defaultMessage:
            'Read a secret (or one field of a secret) from a Vault KV v2 secrets engine.',
        }
      ),
      input: ReadSecretInputSchema,
      handler: async (ctx: ActionContext, input) => {
        const { path, field } = input as { path: string; field?: string };
        const config = ctx.config as unknown as HashicorpVaultConfig;

        const origin = validateVaultAddress(config.address);
        const encodedPath = encodeVaultPathSegments(path);
        const url = `${origin}/v1/${encodedPath}`;

        let response;
        try {
          response = await ctx.client.get(url, { headers: getRequestHeaders(config) });
        } catch (error) {
          // Never forward the raw Axios error: it may carry the full response body
          // and headers as properties, which could echo request/response content.
          const status = getVaultErrorStatus(error);
          throw new Error(
            `Failed to read the Vault secret at path '${path}'${
              status ? ` (HTTP ${status})` : ''
            }. Check the path, the token's policies, and that the mount exists.`
          );
        }

        const parsed = VaultKvV2ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
          // This also doubles as KV v1 detection: a KV v1 response is shaped
          // `{ data: {...} }` (no nested `data.data`), which fails this schema.
          throw new Error(
            `Unexpected response shape from Vault at path '${path}'. Expected a KV v2 secret response ({ data: { data: {...} } }); confirm the path and that the mount is a KV version 2 secrets engine (KV v1 is not supported).`
          );
        }

        const secretData = parsed.data.data.data;

        if (field !== undefined) {
          if (!Object.prototype.hasOwnProperty.call(secretData, field)) {
            throw new Error(
              `Field '${field}' was not found in the Vault secret at path '${path}'.`
            );
          }
          return { value: toSafeStringValue(field, secretData[field]) };
        }

        const values: Record<string, string> = {};
        for (const [key, value] of Object.entries(secretData)) {
          values[key] = toSafeStringValue(key, value);
        }
        return { values };
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.hashicorpVault.test.description', {
      defaultMessage: "Verifies the connection by checking the token's validity with Vault",
    }),
    handler: async (ctx: ActionContext) => {
      const config = ctx.config as unknown as HashicorpVaultConfig;
      const origin = validateVaultAddress(config.address);

      try {
        await ctx.client.get(`${origin}/v1/auth/token/lookup-self`, {
          headers: getRequestHeaders(config),
        });
      } catch (error) {
        const status = getVaultErrorStatus(error);
        throw new Error(
          `Failed to authenticate to Vault${
            status ? ` (HTTP ${status})` : ''
          }. Check the Vault address and token.`
        );
      }

      return {};
    },
    enabled: true,
  },
};
