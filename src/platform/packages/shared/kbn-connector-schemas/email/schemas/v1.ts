/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
import { defaultFooterText } from '../constants';

const PORT_MAX = 256 * 256 - 1;
export const portSchema = () => z.coerce.number().min(1).max(PORT_MAX);

const ConfigSchemaProps = {
  service: z.string().default('other'),
  host: z.string().nullable().default(null),
  port: portSchema().nullable().default(null),
  secure: z.boolean().nullable().default(null),
  from: z.string(),
  hasAuth: z.boolean().default(true),
  tenantId: z.string().nullable().default(null),
  clientId: z.string().nullable().default(null),
  oauthTokenUrl: z.string().nullable().default(null),
};

export const ConfigSchema = z.object(ConfigSchemaProps).strict();

const SecretsSchemaProps = {
  user: z.string().nullable().default(null),
  password: z.string().nullable().default(null),
  clientSecret: z.string().nullable().default(null),
};

export const SecretsSchema = z.object(SecretsSchemaProps).strict();

const AttachmentSchemaProps = {
  content: z.string(),
  contentType: z.string().optional(),
  filename: z.string(),
  encoding: z.string().optional(),
};
export const AttachmentSchema = z.object(AttachmentSchemaProps).strict();

export const ParamsSchemaProps = {
  to: z.array(z.string()).default([]),
  cc: z.array(z.string()).default([]),
  bcc: z.array(z.string()).default([]),
  subject: z.string(),
  message: z.string(),
  messageHTML: z.string().nullable().default(null),
  // kibanaFooterLink isn't inteded for users to set, this is here to be able to programatically
  // provide a more contextual URL in the footer (ex: URL to the alert details page)
  kibanaFooterLink: z
    .object({
      path: z.string().default('/'),
      text: z.string().default(defaultFooterText),
    })
    .strict()
    .default({
      path: '/',
      text: defaultFooterText,
    }),
  attachments: z.array(AttachmentSchema).optional(),
};

export const ParamsSchema = z.object(ParamsSchemaProps).strict();
