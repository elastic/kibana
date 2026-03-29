/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FakeRawRequest, Headers, IBasePath, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { addSpaceIdToPath } from '@kbn/spaces-utils';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';

/**
 * Mirrors Task Manager's fake request construction for tasks that store an API key,
 * so scheduled `workflow:resume` can reuse the same user scope as the original `workflow:run`.
 */
export function buildFakeRequestFromTaskApiKey(
  task: Pick<ConcreteTaskInstance, 'apiKey' | 'userScope'>,
  executionSpaceId: string,
  basePath: IBasePath
): KibanaRequest | undefined {
  if (!task.apiKey) {
    return undefined;
  }

  const requestHeaders: Headers = {};
  requestHeaders.authorization = `ApiKey ${task.apiKey}`;
  const path = addSpaceIdToPath('/', task.userScope?.spaceId ?? executionSpaceId);

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);
  basePath.set(fakeRequest, path);
  return fakeRequest;
}
