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
import type { AuthTypeDefinition } from '../connector_spec';

export const VAULT_APPROLE_AUTH_ID = 'vault_approle';

/**
 * `address`/`namespace` are duplicated from the `.hashicorp_vault` connector's own
 * `config` schema (see `specs/hashicorp_vault/hashicorp_vault.ts`) because the
 * shared auth-type `configure()` hook only ever receives this auth type's own
 * `secret` fields, never the connector's `config` -- see `VaultAppRoleGetTokenOpts`
 * in `../connector_spec.ts` and the connector-provisioning plan §5.4. Both fields
 * must be set to the same values as the connector's own "Vault address"/"Vault
 * namespace" config fields.
 */
const authSchema = lazySchema(() =>
  z
    .object({
      address: z
        .url()
        .max(2048)
        .meta({
          label: i18n.translate('connectorSpecs.vaultAppRoleAuth.address.label', {
            defaultMessage: 'Vault address',
          }),
          helpText: i18n.translate('connectorSpecs.vaultAppRoleAuth.address.helpText', {
            defaultMessage:
              'The base URL used for the AppRole login request. Must match this connector\u2019s own Vault address (above), e.g. https://vault.example.com:8200.',
          }),
          widget: 'text',
          placeholder: 'https://vault.example.com:8200',
          validate: { allowedHosts: true },
        }),
      namespace: z
        .string()
        .max(256)
        .optional()
        .meta({
          label: i18n.translate('connectorSpecs.vaultAppRoleAuth.namespace.label', {
            defaultMessage: 'Vault namespace',
          }),
          helpText: i18n.translate('connectorSpecs.vaultAppRoleAuth.namespace.helpText', {
            defaultMessage:
              'Optional. Must match this connector\u2019s own Vault namespace (above), if set.',
          }),
        }),
      mountPath: z
        .string()
        .max(256)
        .default('approle')
        .meta({
          label: i18n.translate('connectorSpecs.vaultAppRoleAuth.mountPath.label', {
            defaultMessage: 'AppRole mount path',
          }),
          helpText: i18n.translate('connectorSpecs.vaultAppRoleAuth.mountPath.helpText', {
            defaultMessage:
              'The path this Vault instance mounts its AppRole auth method at. Defaults to "approle"; change only if your Vault operator has mounted it elsewhere.',
          }),
        }),
      roleId: z
        .string()
        .min(1, {
          message: i18n.translate('connectorSpecs.vaultAppRoleAuth.roleId.requiredMessage', {
            defaultMessage: 'Role ID is required',
          }),
        })
        .max(256)
        .meta({
          label: i18n.translate('connectorSpecs.vaultAppRoleAuth.roleId.label', {
            defaultMessage: 'Role ID',
          }),
        }),
      secretId: z
        .string()
        .min(1, {
          message: i18n.translate('connectorSpecs.vaultAppRoleAuth.secretId.requiredMessage', {
            defaultMessage: 'Secret ID is required',
          }),
        })
        .max(256)
        .meta({
          sensitive: true,
          label: i18n.translate('connectorSpecs.vaultAppRoleAuth.secretId.label', {
            defaultMessage: 'Secret ID',
          }),
        }),
    })
    .meta({
      label: i18n.translate('connectorSpecs.vaultAppRoleAuth.label', {
        defaultMessage: 'AppRole',
      }),
    })
);

export type VaultAppRoleAuthSchema = z.infer<typeof authSchema>;

/**
 * HashiCorp Vault AppRole authentication (https://developer.hashicorp.com/vault/docs/auth/approle).
 * Definition only (schema + id); see `vault_approle_server.ts` for the server-side
 * `configure()` implementation that performs the actual login and token caching.
 */
export const VaultAppRoleAuth: AuthTypeDefinition = {
  id: VAULT_APPROLE_AUTH_ID,
  schema: authSchema,
  authMode: 'shared',
};
