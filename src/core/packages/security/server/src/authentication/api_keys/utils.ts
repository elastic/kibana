/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const extractApiKeyIdFromAuthzHeader = (
  authorizationHeader: string | string[] | undefined
): string | undefined => {
  if (typeof authorizationHeader !== 'string') {
    return undefined;
  }
  const prefix = 'apikey ';
  if (!authorizationHeader.toLowerCase().startsWith(prefix)) {
    return undefined;
  }
  const encodedApiKey = authorizationHeader.slice(prefix.length);
  return decodeApiKeyId(encodedApiKey);
};

export const decodeApiKeyId = (encodedApiKey: string): string | undefined => {
  const decoded = Buffer.from(encodedApiKey, 'base64').toString();
  const [id] = decoded.split(':');
  return id.trim() === '' ? undefined : id;
};
