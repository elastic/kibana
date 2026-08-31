/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { isUiamCredential, markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { WorkflowExecutionIdentityMissingError } from './errors';
import type { WorkflowExecutionIdentityAttributes } from './saved_object';

const hasKey = (value?: string | null): value is string => Boolean(value);

/**
 * Normalizes a stored UIAM key into the raw `essu_…` secret the Authorization header must carry.
 */
const toUiamAuthorizationValue = (storedUiamApiKey: string): string => {
  if (isUiamCredential(storedUiamApiKey)) {
    return storedUiamApiKey;
  }

  const [, secret] = Buffer.from(storedUiamApiKey, 'base64').toString().split(':');
  return secret && isUiamCredential(secret) ? secret : storedUiamApiKey;
};

const selectAuthorization = ({
  apiKey,
  uiamApiKey,
  uiamApiKeyExternal,
  preferUiam,
}: Pick<WorkflowExecutionIdentityAttributes, 'apiKey' | 'uiamApiKey' | 'uiamApiKeyExternal'> & {
  preferUiam: boolean;
}): { authorization: string; isExternal: boolean } => {
  if (preferUiam && hasKey(uiamApiKey)) {
    return {
      authorization: toUiamAuthorizationValue(uiamApiKey),
      isExternal: uiamApiKeyExternal === true,
    };
  }

  if (hasKey(apiKey)) {
    return { authorization: apiKey, isExternal: false };
  }

  if (hasKey(uiamApiKey)) {
    return {
      authorization: toUiamAuthorizationValue(uiamApiKey),
      isExternal: uiamApiKeyExternal === true,
    };
  }

  throw new WorkflowExecutionIdentityMissingError();
};

/**
 * Builds a fake request authenticated as the stored owner. Throws if neither key exists.
 */
export const buildOwnerFakeRequest = ({
  spaceId,
  preferUiam,
  apiKey,
  uiamApiKey,
  uiamApiKeyExternal,
}: {
  spaceId: string;
  preferUiam: boolean;
} & Pick<
  WorkflowExecutionIdentityAttributes,
  'apiKey' | 'uiamApiKey' | 'uiamApiKeyExternal'
>): KibanaRequest => {
  const { authorization, isExternal } = selectAuthorization({
    apiKey,
    uiamApiKey,
    uiamApiKeyExternal,
    preferUiam,
  });

  const headers: Headers = { authorization: `ApiKey ${authorization}` };
  const fakeRawRequest: FakeRawRequest = {
    headers,
    spaceId: brandSpaceId(spaceId),
  };
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  if (isExternal) {
    markExternalUiamCredential(fakeRequest);
  }

  return fakeRequest;
};
