/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import { mintExecutionApiKeys, MintExecutionApiKeysError } from './mint_execution_api_keys';

const WORKFLOW_ID = 'wf-1';
const KEY_NAME = `Workflows: execution identity ${WORKFLOW_ID}`;

const encode = (id: string, secret: string) => Buffer.from(`${id}:${secret}`).toString('base64');

const sessionUser = { username: 'alice', authentication_type: 'realm' };
const apiKeyUser = {
  username: 'alice',
  authentication_type: 'api_key',
  api_key: { id: 'es-id', name: 'es-key', managed_by: 'elasticsearch' as const },
};
const externalCloudUser = {
  username: 'alice',
  authentication_type: 'api_key',
  api_key: { id: 'cloud-id', name: 'cloud-key', managed_by: 'uiam' as const, internal: false },
};

const sessionRequest = () => httpServerMock.createKibanaRequest();
const apiKeyRequest = (id: string, secret: string) =>
  httpServerMock.createKibanaRequest({
    headers: { authorization: `ApiKey ${encode(id, secret)}` },
  });
const rawCloudRequest = (secret = 'essu_cloud_secret') =>
  httpServerMock.createKibanaRequest({
    headers: { authorization: `ApiKey ${secret}` },
  });

const createSecurity = () => {
  const security = securityServiceMock.createStart();
  security.authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);
  return security;
};

const mint = (
  security: ReturnType<typeof createSecurity>,
  request: ReturnType<typeof sessionRequest>,
  previousApiKeyCreatedByUser?: boolean | null,
  logger = loggingSystemMock.createLogger()
) =>
  mintExecutionApiKeys({
    request,
    security,
    logger,
    workflowId: WORKFLOW_ID,
    previousApiKeyCreatedByUser,
  });

describe('mintExecutionApiKeys', () => {
  it('grants an ES-only framework key from a session request', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
    security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-1',
      name: KEY_NAME,
      api_key: 'es-secret',
    });

    await expect(mint(security, sessionRequest())).resolves.toEqual({
      apiKey: encode('es-1', 'es-secret'),
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: false,
    });

    expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(expect.anything(), {
      name: KEY_NAME,
      role_descriptors: {},
      metadata: { managed: true, kibana: { type: 'workflow_execution_identity' } },
    });
    expect(security.authc.apiKeys.uiam?.grant).not.toHaveBeenCalled();
    expect(security.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
  });

  it('grants UIAM then ES and writes uiamApiKeyExternal when the request has UIAM credentials', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
    security.authc.apiKeys.uiam!.grant.mockResolvedValue({
      id: 'uiam-1',
      name: `uiam-${KEY_NAME}`,
      api_key: 'essu_granted',
    });
    security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-1',
      name: KEY_NAME,
      api_key: 'es-secret',
    });

    await expect(mint(security, rawCloudRequest())).resolves.toEqual({
      apiKey: encode('es-1', 'es-secret'),
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: false,
      uiamApiKey: encode('uiam-1', 'essu_granted'),
      uiamApiKeyExternal: false,
    });

    expect(security.authc.apiKeys.uiam?.grant).toHaveBeenCalledWith(expect.anything(), {
      name: `uiam-${KEY_NAME}`,
    });
  });

  it('invalidates the granted UIAM key and throws when the ES grant fails', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
    security.authc.apiKeys.uiam!.grant.mockResolvedValue({
      id: 'uiam-1',
      name: `uiam-${KEY_NAME}`,
      api_key: 'essu_granted',
    });
    security.authc.apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es down'));

    await expect(mint(security, rawCloudRequest())).rejects.toThrow('es down');
    expect(security.authc.apiKeys.uiam?.invalidate).toHaveBeenCalledWith(expect.anything(), {
      id: 'uiam-1',
    });
  });

  it('logs and continues with an ES-only identity when the UIAM grant fails', async () => {
    const security = createSecurity();
    const logger = loggingSystemMock.createLogger();
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
    security.authc.apiKeys.uiam!.grant.mockRejectedValue(new Error('UIAM service unavailable'));
    security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-1',
      name: KEY_NAME,
      api_key: 'es-secret',
    });

    await expect(mint(security, rawCloudRequest(), undefined, logger)).resolves.toEqual({
      apiKey: encode('es-1', 'es-secret'),
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: false,
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create UIAM API key')
    );
  });

  it('logs and continues with an ES-only identity when the UIAM grant returns null', async () => {
    const security = createSecurity();
    const logger = loggingSystemMock.createLogger();
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
    security.authc.apiKeys.uiam!.grant.mockResolvedValue(null);
    security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-1',
      name: KEY_NAME,
      api_key: 'es-secret',
    });

    await expect(mint(security, rawCloudRequest(), undefined, logger)).resolves.toEqual({
      apiKey: encode('es-1', 'es-secret'),
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: false,
    });

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to create UIAM API key for workflow execution identity "${KEY_NAME}"`
    );
  });

  it('invalidates the granted UIAM key when ES grant returns null', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
    security.authc.apiKeys.uiam!.grant.mockResolvedValue({
      id: 'uiam-1',
      name: `uiam-${KEY_NAME}`,
      api_key: 'essu_granted',
    });
    security.authc.apiKeys.grantAsInternalUser.mockResolvedValue(null);

    await expect(mint(security, rawCloudRequest())).rejects.toThrow(MintExecutionApiKeysError);
    expect(security.authc.apiKeys.uiam?.invalidate).toHaveBeenCalledWith(expect.anything(), {
      id: 'uiam-1',
    });
  });

  it('reuses an ES API key from the request and marks it created by the user', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(apiKeyUser as never);

    await expect(mint(security, apiKeyRequest('es-id', 'es-secret'))).resolves.toEqual({
      apiKey: encode('es-id', 'es-secret'),
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: true,
    });

    expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    expect(security.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    expect(security.authc.apiKeys.uiam?.grant).not.toHaveBeenCalled();
  });

  it('reuses a raw Cloud API key as-is and writes uiamApiKeyExternal', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(externalCloudUser as never);

    await expect(mint(security, rawCloudRequest('essu_cloud_secret'))).resolves.toEqual({
      apiKey: null,
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: true,
      uiamApiKey: 'essu_cloud_secret',
      uiamApiKeyExternal: true,
    });
  });

  it('throws when a Cloud API key is used without a UIAM service', async () => {
    const security = createSecurity();
    security.authc.apiKeys.uiam = null;
    security.authc.getCurrentUser.mockReturnValue(externalCloudUser as never);

    await expect(mint(security, rawCloudRequest())).rejects.toThrow(
      /Cloud API keys are only supported in serverless/
    );
  });

  it('clones the request ES key when rotating a framework-managed identity', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(apiKeyUser as never);
    security.authc.apiKeys.cloneAsInternalUser.mockResolvedValue({
      id: 'cloned-1',
      name: KEY_NAME,
      api_key: 'cloned-secret',
      encoded: encode('cloned-1', 'cloned-secret'),
    });

    await expect(mint(security, apiKeyRequest('es-id', 'es-secret'), false)).resolves.toEqual({
      apiKey: encode('cloned-1', 'cloned-secret'),
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: false,
    });

    expect(security.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalledWith(expect.anything(), {
      name: KEY_NAME,
      metadata: { managed: true, kibana: { type: 'workflow_execution_identity' } },
    });
    expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
  });

  it('grants a fresh UIAM framework key when rotating a Cloud-key request', async () => {
    const security = createSecurity();
    security.authc.getCurrentUser.mockReturnValue(externalCloudUser as never);
    security.authc.apiKeys.uiam!.grant.mockResolvedValue({
      id: 'uiam-clone',
      name: `uiam-${KEY_NAME}`,
      api_key: 'essu_fresh',
    });

    await expect(mint(security, rawCloudRequest(), false)).resolves.toEqual({
      apiKey: null,
      apiKeyOwner: 'alice',
      apiKeyCreatedByUser: false,
      uiamApiKey: encode('uiam-clone', 'essu_fresh'),
      uiamApiKeyExternal: false,
    });

    expect(security.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    expect(security.authc.apiKeys.uiam?.grant).toHaveBeenCalled();
  });

  it('throws when API keys are disabled', async () => {
    const security = createSecurity();
    security.authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(false);
    security.authc.getCurrentUser.mockReturnValue(sessionUser as never);

    await expect(mint(security, sessionRequest())).rejects.toThrow(
      'API keys are not enabled, cannot create execution identity.'
    );
    expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
  });
});
