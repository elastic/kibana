/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

const API_KEY_NAME_MAX_LENGTH = 256;

/** The credential a page submission launches its run with. */
export interface PageRunApiKey {
  apiKeyId: string;
  /** `base64(id:key)`, the form an `ApiKey` authorization header carries. */
  apiKey: string;
  /** The user who saved the workflow. The Share dialog names them. */
  username: string;
}

/**
 * Mints an API key for the user who saved a page workflow, as Task Manager does for a
 * scheduled trigger. A page visitor has no Kibana identity, so the run needs one.
 * Returns `null` when the request has no user to act for, such as an internal request.
 */
export const grantPageRunApiKey = async ({
  security,
  request,
  workflowId,
}: {
  security: SecurityServiceStart;
  request: KibanaRequest;
  workflowId: string;
}): Promise<PageRunApiKey | null> => {
  const user = security.authc.getCurrentUser(request);
  if (!user || !(await security.authc.apiKeys.areAPIKeysEnabled())) {
    return null;
  }
  const params = {
    name: `Workflow page: ${workflowId} - ${user.username}`.slice(0, API_KEY_NAME_MAX_LENGTH),
    metadata: { managed: true, workflowId },
  };
  // A key cannot be granted for a request that itself uses an API key, so clone that key.
  // Either way the page owns the new key and invalidates it when it is replaced.
  const created =
    user.authentication_type === 'api_key'
      ? await security.authc.apiKeys.cloneAsInternalUser(request, params)
      : await security.authc.apiKeys.grantAsInternalUser(request, {
          ...params,
          role_descriptors: {},
        });
  if (!created) {
    return null;
  }
  return {
    apiKeyId: created.id,
    apiKey: Buffer.from(`${created.id}:${created.api_key}`).toString('base64'),
    username: user.username,
  };
};

/**
 * Builds the request a page submission runs under, from the key of the user who last
 * saved the workflow. When the workflow sets `settings.run_as`, the execution engine
 * runs the steps as that service account instead, as it does for scheduled runs.
 */
export const buildPageRunRequest = (encodedApiKey: string) => {
  const headers: Headers = { authorization: `ApiKey ${encodedApiKey}` };
  const fakeRawRequest: FakeRawRequest = { headers };
  return kibanaRequestFactory(fakeRawRequest);
};
