/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
import { AuthConfiguration } from '../../common/auth';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const HeadersSchema = z.record(z.string(), z.string());

export const ConfigSchema = z
  .object({
    url: z.string().url(),
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
  })
  .strict();

export const ParamsSchema = z
  .object({
    url: z.string().url().optional(),
    path: z.string().optional(),
    method: z.enum(HTTP_METHODS).default('GET'),
    body: z.string().optional(),
    query: z.record(z.string(), z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    fetcher: z
      .object({
        skip_ssl_verification: z.boolean().optional(),
        follow_redirects: z.boolean().optional(),
        max_redirects: z.number().optional(),
        keep_alive: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();
