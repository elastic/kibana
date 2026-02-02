/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:src/platform/packages/shared/kbn-synthtrace/src/cli/utils/get_auth_header.ts
export const getApiKeyHeader = (apiKey?: string) => {
  return apiKey ? { Authorization: `ApiKey ${apiKey}` } : undefined;
};

export const getBasicAuthHeader = (username?: string, password?: string) => {
  return username || password
    ? {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      }
    : {};
};
========
export const SAVED_OBJECT_REF_NAME = 'savedObjectRef';
>>>>>>>> a355a6a6d71838bd4834d7354af3ee3cba45d37c:src/platform/packages/shared/presentation/presentation_publishing/constants.ts
