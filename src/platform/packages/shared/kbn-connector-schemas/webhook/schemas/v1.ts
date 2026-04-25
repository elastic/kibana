/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod/v4';
import { AuthConfiguration, WebhookMethods } from '../../common/auth';

export const HeadersSchema = z.record(z.string(), z.string());

const configSchemaProps = {
  url: z.string(),
  method: z
    .enum([
      WebhookMethods.POST,
      WebhookMethods.PUT,
      WebhookMethods.PATCH,
      WebhookMethods.GET,
      WebhookMethods.DELETE,
    ])
    .default(WebhookMethods.POST),
  headers: HeadersSchema.nullable().default(null),
  hasAuth: AuthConfiguration.hasAuth,
  authType: AuthConfiguration.authType,
  certType: AuthConfiguration.certType,
  ca: AuthConfiguration.ca,
  verificationMode: AuthConfiguration.verificationMode,
  accessTokenUrl: AuthConfiguration.accessTokenUrl,
  clientId: AuthConfiguration.clientId,
  scope: AuthConfiguration.scope,
  additionalFields: AuthConfiguration.additionalFields,
};

function normalizeAuthTypeForUnauthenticatedConnectors(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const config = value as Record<string, unknown>;
  if (config.hasAuth === false && config.authType === undefined) {
    return { ...config, authType: null };
  }

  return value;
}

export const ConfigSchema = z.preprocess(
  normalizeAuthTypeForUnauthenticatedConnectors,
  z.object(configSchemaProps).strict()
);

export const ParamsSchema = z
  .object({
    body: z.string().optional(),
  })
  .strict();
