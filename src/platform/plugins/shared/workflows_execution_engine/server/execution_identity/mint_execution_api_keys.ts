/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import type { WorkflowExecutionIdentityAttributes } from './saved_object';

export class MintExecutionApiKeysError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MintExecutionApiKeysError';
  }
}

export type MintedExecutionApiKeys = Omit<WorkflowExecutionIdentityAttributes, 'workflowId'>;

interface KeyPair {
  id?: string;
  api_key: string;
  external?: boolean;
}

const encodeApiKey = (id?: string, key?: string): string | null =>
  id && key ? Buffer.from(`${id}:${key}`).toString('base64') : null;

const hasUiamService = (security: SecurityServiceStart): boolean =>
  security.authc.apiKeys.uiam != null;

const isApiKeyAuthentication = (
  security: SecurityServiceStart,
  request: KibanaRequest
): boolean => {
  const user = security.authc.getCurrentUser(request);
  if (user?.authentication_type) {
    return user.authentication_type === 'api_key';
  }
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  return authorizationHeader?.scheme.toLowerCase() === 'apikey';
};

const isExternalUiamUser = (security: SecurityServiceStart, request: KibanaRequest): boolean =>
  security.authc.getCurrentUser(request)?.api_key?.internal === false;

const toStoredAttributes = ({
  es,
  uiam,
  username,
  createdByUser,
}: {
  es?: KeyPair;
  uiam?: KeyPair;
  username: string | null;
  createdByUser: boolean;
}): MintedExecutionApiKeys => {
  if (es?.api_key && uiam?.api_key && createdByUser) {
    throw new MintExecutionApiKeysError(
      'Both ES and UIAM API keys were produced for a user-created key; only one should exist.'
    );
  }

  const encodedApiKey = encodeApiKey(es?.id, es?.api_key);
  const encodedUiamApiKey =
    encodeApiKey(uiam?.id, uiam?.api_key) ?? (createdByUser && uiam?.api_key ? uiam.api_key : null);

  if (!encodedApiKey && !encodedUiamApiKey) {
    throw new MintExecutionApiKeysError('Failed to mint execution API keys.');
  }

  return {
    apiKey: encodedApiKey,
    apiKeyOwner: username,
    apiKeyCreatedByUser: createdByUser,
    ...(encodedUiamApiKey
      ? { uiamApiKey: encodedUiamApiKey, uiamApiKeyExternal: uiam?.external === true }
      : {}),
  };
};

const throwIfCloudKeyOnStateful = (security: SecurityServiceStart, name: string): void => {
  if (!hasUiamService(security)) {
    throw new MintExecutionApiKeysError(
      `Cannot use a Cloud API key to create execution identity "${name}". ` +
        `Cloud API keys are only supported in serverless environments; ` +
        `use a project-scoped Elasticsearch API key instead.`
    );
  }
};

const tryGrantUiam = async (
  request: KibanaRequest,
  security: SecurityServiceStart,
  name: string
): Promise<KeyPair | undefined> => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!hasUiamService(security) || !authorizationHeader || !isUiamCredential(authorizationHeader)) {
    return undefined;
  }

  try {
    const result = await security.authc.apiKeys.uiam?.grant(request, { name: `uiam-${name}` });
    if (!result) {
      return undefined;
    }
    return { id: result.id, api_key: result.api_key };
  } catch {
    return undefined;
  }
};

const invalidateGrantedUiam = async (
  request: KibanaRequest,
  security: SecurityServiceStart,
  uiam?: KeyPair
): Promise<void> => {
  if (!uiam?.id) {
    return;
  }
  try {
    await security.authc.apiKeys.uiam?.invalidate(request, { id: uiam.id });
  } catch {
    // Best-effort: the caller still throws the original grant error.
  }
};

const grantKeys = async (
  request: KibanaRequest,
  security: SecurityServiceStart,
  name: string
): Promise<{ es?: KeyPair; uiam?: KeyPair }> => {
  const uiam = await tryGrantUiam(request, security, name);
  try {
    const es = await security.authc.apiKeys.grantAsInternalUser(request, {
      name,
      role_descriptors: {},
      metadata: { managed: true, kibana: { type: 'workflow_execution_identity' } },
    });
    if (!es) {
      throw new MintExecutionApiKeysError(
        'API keys are not enabled, cannot create execution identity.'
      );
    }
    return { es: { id: es.id, api_key: es.api_key }, uiam };
  } catch (error) {
    await invalidateGrantedUiam(request, security, uiam);
    throw error;
  }
};

const cloneKeys = async (
  request: KibanaRequest,
  security: SecurityServiceStart,
  name: string
): Promise<{ es?: KeyPair; uiam?: KeyPair }> => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorizationHeader && isUiamCredential(authorizationHeader)) {
    throwIfCloudKeyOnStateful(security, name);
    const uiam = await security.authc.apiKeys.uiam?.grant(request, { name: `uiam-${name}` });
    if (!uiam) {
      throw new MintExecutionApiKeysError(
        `Failed to grant UIAM API key for cloned execution identity "${name}".`
      );
    }
    return { uiam: { id: uiam.id, api_key: uiam.api_key } };
  }

  const cloneResult = await security.authc.apiKeys.cloneAsInternalUser(request, {
    name,
    metadata: { managed: true, kibana: { type: 'workflow_execution_identity' } },
  });
  if (!cloneResult) {
    throw new MintExecutionApiKeysError(
      'API key clone returned null (security feature may be disabled).'
    );
  }
  return { es: { id: cloneResult.id, api_key: cloneResult.api_key } };
};

const reuseKeysFromRequest = (
  request: KibanaRequest,
  security: SecurityServiceStart,
  name: string
): { es?: KeyPair; uiam?: KeyPair } => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!authorizationHeader?.credentials) {
    throw new MintExecutionApiKeysError(
      'Could not extract API key from the request authorization header.'
    );
  }

  const isExternal = isExternalUiamUser(security, request);

  if (isUiamCredential(authorizationHeader)) {
    throwIfCloudKeyOnStateful(security, name);
    return {
      uiam: {
        api_key: authorizationHeader.credentials,
        ...(isExternal ? { external: true } : {}),
      },
    };
  }

  const [apiKeyId, apiKey] = Buffer.from(authorizationHeader.credentials, 'base64')
    .toString()
    .split(':');

  if (!apiKeyId || !apiKey) {
    throw new MintExecutionApiKeysError(
      `Failed to parse API key credentials from authorization header for "${name}".`
    );
  }

  if (isUiamCredential(apiKey)) {
    throwIfCloudKeyOnStateful(security, name);
    return {
      uiam: {
        id: apiKeyId,
        api_key: apiKey,
        ...(isExternal ? { external: true } : {}),
      },
    };
  }

  return { es: { id: apiKeyId, api_key: apiKey } };
};

/**
 * Mints ES (+ UIAM when present) keys from the current request.
 */
export const mintExecutionApiKeys = async ({
  request,
  security,
  workflowId,
  previousApiKeyCreatedByUser,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  workflowId: string;
  previousApiKeyCreatedByUser?: boolean | null;
}): Promise<MintedExecutionApiKeys> => {
  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw new MintExecutionApiKeysError(
      'API keys are not enabled, cannot create execution identity.'
    );
  }

  const name = `Workflows: execution identity ${workflowId}`;
  const username = security.authc.getCurrentUser(request)?.username ?? null;
  const isApiKeyAuth = isApiKeyAuthentication(security, request);
  const frameworkManaged = previousApiKeyCreatedByUser === false;

  const minted = frameworkManaged
    ? isApiKeyAuth
      ? await cloneKeys(request, security, name)
      : await grantKeys(request, security, name)
    : isApiKeyAuth
    ? reuseKeysFromRequest(request, security, name)
    : await grantKeys(request, security, name);

  return toStoredAttributes({
    ...minted,
    username,
    createdByUser: isApiKeyAuth && !frameworkManaged,
  });
};
