/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import {
  VaultAppRoleAuth as VaultAppRoleAuthDefinition,
  type VaultAppRoleAuthSchema,
} from './vault_approle';

const VAULT_TOKEN_HEADER = 'X-Vault-Token';

/**
 * Server-side `configure()` for the `vault_approle` auth type. Only calls
 * `ctx.getToken()` -- the actual AppRole login request and `connectorTokenClient`
 * caching live in the actions plugin's `VaultAppRoleStrategy`
 * (`x-pack/platform/plugins/shared/actions/server/lib/axios_auth_strategies/vault_approle_strategy.ts`),
 * reached via the same `authTypeRegistry`/`getAxiosAuthStrategy` dispatch every
 * other `getToken`-based auth type uses.
 *
 * Deliberately does not interpolate the underlying error's message: this auth
 * type exists solely to authenticate to Vault, and every one of `.hashicorp_vault`'s
 * own error paths are name-only by design (guarantee 4a in the connector-provisioning
 * plan) -- this stays consistent with that discipline rather than reintroducing a
 * value-echoing error path one layer up.
 */
export const VaultAppRoleAuth: AuthTypeSpec<VaultAppRoleAuthSchema> = {
  ...VaultAppRoleAuthDefinition,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: VaultAppRoleAuthSchema
  ): Promise<AxiosInstance> => {
    let token: string | null;
    try {
      token = await ctx.getToken({
        authType: 'vault_approle',
        address: secret.address,
        namespace: secret.namespace,
        mountPath: secret.mountPath,
        roleId: secret.roleId,
        secretId: secret.secretId,
      });
    } catch {
      throw new Error('Unable to authenticate to Vault via AppRole.');
    }

    if (!token) {
      throw new Error('Unable to authenticate to Vault via AppRole.');
    }

    axiosInstance.defaults.headers.common[VAULT_TOKEN_HEADER] = token;

    return axiosInstance;
  },
};
