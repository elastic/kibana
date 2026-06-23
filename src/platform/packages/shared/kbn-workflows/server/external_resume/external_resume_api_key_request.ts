/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface ApiKeyAuthenticateResponse {
  api_key?: {
    id?: string;
    name?: string;
  };
}

export function getAuthenticatedExternalResumeApiKeyId(
  authentication: ApiKeyAuthenticateResponse,
  encodedApiKey: string
): string | undefined {
  return authentication.api_key?.id ?? decodeApiKeyId(encodedApiKey);
}

function decodeApiKeyId(encodedApiKey: string): string | undefined {
  try {
    const decoded = Buffer.from(encodedApiKey, 'base64').toString('utf8');
    const [id] = decoded.split(':');
    return id || undefined;
  } catch {
    return undefined;
  }
}
