/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
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

export const ConfigSchema = z.object(configSchemaProps).strict();

export const ParamsSchema = z
  .object({
    body: z.string().optional(),
  })
  .strict();
