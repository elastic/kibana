/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { AuthType, SSLCertType } from '../constants';

export const authTypeSchema = z
  .union([
    z.literal(AuthType.Basic),
    z.literal(AuthType.SSL),
    z.literal(AuthType.OAuth2ClientCredentials),
    z.literal(null),
  ])
  .default(AuthType.Basic)
  .optional();

export const hasAuthSchema = z.boolean().default(true);

const HeadersSchema = z.record(z.string(), z.string());

export const AuthConfiguration = {
  hasAuth: hasAuthSchema,
  authType: authTypeSchema,
  certType: z.enum([SSLCertType.CRT, SSLCertType.PFX]).optional(),
  ca: z.string().optional(),
  verificationMode: z.enum(['none', 'certificate', 'full']).optional(),
  accessTokenUrl: z.string().optional(),
  clientId: z.string().optional(),
  scope: z.string().optional(),
  additionalFields: z.string().nullish(),
};

export const SecretConfiguration = {
  user: z.string().nullable().default(null),
  password: z.string().nullable().default(null),
  crt: z.string().nullable().default(null),
  key: z.string().nullable().default(null),
  pfx: z.string().nullable().default(null),
  clientSecret: z.string().nullable().default(null),
  secretHeaders: HeadersSchema.nullable().default(null),
};

export const SecretConfigurationSchemaValidation = {
  validate: (secrets: any) => {
    // user and password must be set together (or not at all)
    if (
      !secrets.password &&
      !secrets.user &&
      !secrets.crt &&
      !secrets.key &&
      !secrets.pfx &&
      !secrets.clientSecret
    ) {
      return;
    }

    if (
      secrets.password &&
      secrets.user &&
      !secrets.crt &&
      !secrets.key &&
      !secrets.pfx &&
      !secrets.clientSecret
    ) {
      return;
    }

    if (secrets.crt && secrets.key && !secrets.user && !secrets.pfx && !secrets.clientSecret) {
      return;
    }

    if (!secrets.crt && !secrets.key && !secrets.user && secrets.pfx && !secrets.clientSecret) {
      return;
    }

    if (
      !secrets.password &&
      !secrets.user &&
      !secrets.crt &&
      !secrets.key &&
      !secrets.pfx &&
      secrets.clientSecret
    ) {
      return;
    }

    return i18n.translate('xpack.stackConnectors.webhook.invalidSecrets', {
      defaultMessage:
        'must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or clientSecret (for OAuth2)',
    });
  },
};

export const SecretConfigurationSchema = z
  .object(SecretConfiguration)
  .strict()
  .superRefine((secrets, ctx) => {
    const errorMessage = SecretConfigurationSchemaValidation.validate(secrets);
    if (errorMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: errorMessage,
      });
    }
  });
