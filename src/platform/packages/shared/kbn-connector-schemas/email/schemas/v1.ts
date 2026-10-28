/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defaultFooterText } from '../constants';

const PORT_MAX = 256 * 256 - 1;
export const portSchema = () => z.coerce.number().min(1).max(PORT_MAX);

const ConfigSchemaProps = {
  service: lazySchema(() => z.string().default('other')),
  host: lazySchema(() => z.string().nullable().default(null)),
  port: lazySchema(() => portSchema().nullable().default(null)),
  secure: lazySchema(() => z.boolean().nullable().default(null)),
  from: lazySchema(() => z.string()),
  hasAuth: lazySchema(() => z.boolean().default(true)),
  tenantId: lazySchema(() => z.string().nullable().default(null)),
  clientId: lazySchema(() => z.string().nullable().default(null)),
  oauthTokenUrl: lazySchema(() => z.string().nullable().default(null)),
  allowHtml: lazySchema(() => z.boolean().optional()),
};

export const ConfigSchema = lazySchema(() => z.object(ConfigSchemaProps).strict());

const SecretsSchemaProps = {
  user: lazySchema(() => z.string().nullable().default(null)),
  password: lazySchema(() => z.string().nullable().default(null)),
  clientSecret: lazySchema(() => z.string().nullable().default(null)),
};

export const SecretsSchema = lazySchema(() => z.object(SecretsSchemaProps).strict());

const AttachmentSchemaProps = {
  content: lazySchema(() => z.string()),
  contentType: lazySchema(() => z.string().optional()),
  filename: lazySchema(() => z.string()),
  encoding: lazySchema(() => z.string().optional()),
};
export const AttachmentSchema = lazySchema(() => z.object(AttachmentSchemaProps).strict());

export const emailSchema = lazySchema(() => z.array(z.string().max(512)).max(100));

export const ParamsSchemaProps = {
  to: lazySchema(() => emailSchema.default([])),
  cc: lazySchema(() => emailSchema.default([])),
  bcc: lazySchema(() => emailSchema.default([])),
  replyTo: lazySchema(() => z.array(z.string().max(512)).max(10).optional()),
  subject: lazySchema(() => z.string()),
  message: lazySchema(() => z.string()),
  messageHTML: lazySchema(() => z.string().nullable().default(null)),
  // kibanaFooterLink isn't inteded for users to set, this is here to be able to programatically
  // provide a more contextual URL in the footer (ex: URL to the alert details page)
  kibanaFooterLink: lazySchema(() =>
    z
      .object({
        path: z.string().default('/'),
        text: z.string().default(defaultFooterText),
      })
      .strict()
      .default({
        path: '/',
        text: defaultFooterText,
      })
  ),
  attachments: lazySchema(() => z.array(AttachmentSchema).optional()),
};

export const ParamsSchema = lazySchema(() => z.object(ParamsSchemaProps).strict());
