/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodError } from '@kbn/zod';
import { z } from '@kbn/zod';
import {
  serverlessProjectTypes,
  serverlessProductTiers,
  type ServerlessProjectType,
  type ServerlessProductTier,
} from '@kbn/es';

const PROJECT_TYPES_WITH_TIER: ReadonlySet<string> = new Set(['security', 'oblt']);

// `@kbn/es` exposes these as `Set<string>` on 9.2; `z.enum` requires a non-empty
// readonly tuple, so materialize them once as typed tuples for both schema use
// and human-readable error messages.
const projectTypeValues = Array.from(serverlessProjectTypes) as [
  ServerlessProjectType,
  ...ServerlessProjectType[]
];
const productTierValues = Array.from(serverlessProductTiers) as [
  ServerlessProductTier,
  ...ServerlessProductTier[]
];

const ServerlessProjectTypeSchema = z.enum(projectTypeValues, {
  errorMap: () => ({ message: `must be one of: ${projectTypeValues.join(' | ')}` }),
});

const ServerlessProductTierSchema = z.enum(productTierValues, {
  errorMap: () => ({ message: `must be one of: ${productTierValues.join(' | ')}` }),
});

const HostsSchema = z.object({
  kibana: z
    .string({ required_error: 'is required', invalid_type_error: 'must be a string' })
    .url({ message: "must be a valid URL (e.g. 'https://my.kibana.co')" }),
  elasticsearch: z
    .string({ required_error: 'is required', invalid_type_error: 'must be a string' })
    .url({ message: "must be a valid URL (e.g. 'https://my.elasticsearch.co')" }),
});

const AuthSchema = z.object({
  username: z
    .string({ required_error: 'is required', invalid_type_error: 'must be a string' })
    .min(1, { message: 'must be a non-empty string' }),
  password: z
    .string({ required_error: 'is required', invalid_type_error: 'must be a string' })
    .min(1, { message: 'must be a non-empty string' }),
});

const LinkedProjectSchema = z.object({
  hosts: z.object({
    elasticsearch: z
      .string({ required_error: 'is required', invalid_type_error: 'must be a string' })
      .url({ message: 'must be a valid URL' }),
  }),
  auth: AuthSchema,
});

/**
 * Schema for the JSON config files consumed by Scout (`local.json`,
 * `cloud_ech.json`, `cloud_mki.json`).
 *
 * Defaults are applied for fields that are present in the auto-generated
 * `local.json` but commonly omitted from manually-authored cloud configs
 * (`http2`, `license`). All other required fields raise a clear
 * validation error if missing or invalid.
 *
 * Cross-field rules enforced via `superRefine`:
 * - `serverless: true` requires `projectType`.
 * - `serverless: true` with `projectType` of `security` or `oblt` requires
 *   `productTier`.
 * - `serverless: false` (stateful) forbids `projectType`, `productTier`,
 *   `organizationId`, and `linkedProject`.
 * - `isCloud: true` requires `cloudHostName` (used by SAML against Elastic
 *   Cloud) and forbids `http2: true`.
 */
export const ScoutTestConfigSchema = z
  .object({
    serverless: z.boolean({
      required_error: 'is required and must be a boolean',
      invalid_type_error: 'is required and must be a boolean',
    }),
    http2: z.boolean().default(false),
    isCloud: z.boolean({
      required_error: 'is required and must be a boolean',
      invalid_type_error: 'is required and must be a boolean',
    }),
    cloudHostName: z.string().min(1).optional(),
    cloudUsersFilePath: z
      .string({ required_error: 'is required', invalid_type_error: 'must be a string' })
      .min(1, { message: 'must be a non-empty file path' }),
    license: z.string().min(1).default('trial'),
    projectType: ServerlessProjectTypeSchema.optional(),
    productTier: ServerlessProductTierSchema.optional(),
    organizationId: z.string().min(1).optional(),
    hosts: HostsSchema,
    auth: AuthSchema,
    linkedProject: LinkedProjectSchema.optional(),
    metadata: z.any().optional(),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.serverless) {
      if (cfg.projectType === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['projectType'],
          message:
            `is required when 'serverless' is true. ` +
            `Expected one of: ${projectTypeValues.join(' | ')}`,
        });
      } else if (PROJECT_TYPES_WITH_TIER.has(cfg.projectType) && cfg.productTier === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['productTier'],
          message:
            `is required when 'projectType' is '${cfg.projectType}'. ` +
            `Expected one of: ${productTierValues.join(' | ')}`,
        });
      }
    } else {
      const forbiddenForStateful: Array<keyof typeof cfg> = [
        'projectType',
        'productTier',
        'organizationId',
        'linkedProject',
      ];
      for (const field of forbiddenForStateful) {
        if (cfg[field] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `must not be set when 'serverless' is false (stateful)`,
          });
        }
      }
    }

    if (cfg.isCloud && (cfg.cloudHostName === undefined || cfg.cloudHostName === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['cloudHostName'],
        message: `is required when 'isCloud' is true (used by SAML against Elastic Cloud)`,
      });
    }

    if (cfg.isCloud && cfg.http2 === true) {
      ctx.addIssue({
        code: 'custom',
        path: ['http2'],
        message:
          `must not be true when 'isCloud' is true; ` +
          `'http2' enables TLS verification bypass and is only meaningful for local development`,
      });
    }
  });

/**
 * Format a Zod validation error from {@link ScoutTestConfigSchema} into a
 * single, human-friendly message. Each issue is rendered as
 * `'<field.path>' <message>`, prefixed with the source (file path) the config
 * was loaded from when provided.
 */
export const formatScoutTestConfigError = (error: ZodError, source?: string): string => {
  const issues = error.issues.map((issue) => {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return ` - '${fieldPath}' ${issue.message}`;
  });
  const heading = source
    ? `Invalid Scout test config at "${source}" (${issues.length} issue(s)):`
    : `Invalid Scout test config (${issues.length} issue(s)):`;
  return `${heading}\n${issues.join('\n')}`;
};

/**
 * Validate and normalize a Scout test config object. Throws a friendly,
 * aggregated error message on validation failure.
 */
export const parseScoutTestConfig = (
  input: unknown,
  source?: string
): z.infer<typeof ScoutTestConfigSchema> => {
  const result = ScoutTestConfigSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  throw new Error(formatScoutTestConfigError(result.error, source));
};
