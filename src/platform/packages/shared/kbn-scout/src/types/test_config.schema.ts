/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodError } from '@kbn/zod/v4';
import { z } from '@kbn/zod/v4';
import { serverlessProjectTypes, serverlessProductTiers } from '@kbn/es';

const PROJECT_TYPES_WITH_TIER: ReadonlySet<string> = new Set(['security', 'oblt']);

const ServerlessProjectTypeSchema = z.enum(serverlessProjectTypes, {
  error: `must be one of: ${serverlessProjectTypes.join(' | ')}`,
});

const ServerlessProductTierSchema = z.enum(serverlessProductTiers, {
  error: `must be one of: ${serverlessProductTiers.join(' | ')}`,
});

const HostsSchema = z.object({
  kibana: z.url({ error: "must be a valid URL (e.g. 'https://my.kibana.co')" }),
  elasticsearch: z.url({ error: "must be a valid URL (e.g. 'https://my.elasticsearch.co')" }),
});

const AuthSchema = z.object({
  username: z.string({ error: 'is required' }).min(1, { error: 'must be a non-empty string' }),
  password: z.string({ error: 'is required' }).min(1, { error: 'must be a non-empty string' }),
});

const LinkedProjectSchema = z.object({
  hosts: z.object({
    elasticsearch: z.url({ error: 'must be a valid URL' }),
  }),
  auth: AuthSchema,
});

/**
 * Schema for the JSON config files consumed by Scout (`local.json`,
 * `cloud_ech.json`, `cloud_mki.json`).
 *
 * Defaults are applied for fields that are present in the auto-generated
 * `local.json` but commonly omitted from manually-authored cloud configs
 * (`http2`, `uiam`, `license`). All other required fields raise a clear
 * validation error if missing or invalid.
 *
 * Cross-field rules enforced via `superRefine`:
 * - `serverless: true` requires `projectType`.
 * - `serverless: true` with `projectType` of `security` or `oblt` requires
 *   `productTier`.
 * - `serverless: false` (stateful) forbids `projectType`, `productTier`,
 *   `organizationId`, `linkedProject`, and `uiam: true` (UIAM is serverless-
 *   only).
 * - `isCloud: true` requires `cloudHostName` (used by SAML against Elastic
 *   Cloud), forbids `http2: true`, and forbids any `uiam` value that does not
 *   match `serverless` (UIAM behavior on cloud is fixed). Local runs may set
 *   `uiam` freely so TS server configs can drive it via `esServerlessOptions`.
 */
export const ScoutTestConfigSchema = z
  .object({
    serverless: z.boolean({ error: 'is required and must be a boolean' }),
    http2: z.boolean().default(false),
    // `uiam` defaults to mirror `serverless` (UIAM-only on serverless, never
    // on stateful), but local server configs (the TS files under
    // `servers/configs/config_sets/**`) can opt in/out via
    // `esServerlessOptions.uiam`, and that choice is persisted into
    // `local.json`. We therefore accept any boolean here for local runs and
    // enforce the canonical rule only when `isCloud: true` (UIAM behavior on
    // Elastic Cloud cannot be overridden) and reject `uiam: true` on stateful.
    uiam: z.boolean({ error: 'must be a boolean' }).optional(),
    isCloud: z.boolean({ error: 'is required and must be a boolean' }),
    cloudHostName: z.string().min(1).optional(),
    cloudUsersFilePath: z
      .string({ error: 'is required' })
      .min(1, { error: 'must be a non-empty file path' }),
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
            `Expected one of: ${serverlessProjectTypes.join(' | ')}`,
        });
      } else if (PROJECT_TYPES_WITH_TIER.has(cfg.projectType) && cfg.productTier === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['productTier'],
          message:
            `is required when 'projectType' is '${cfg.projectType}'. ` +
            `Expected one of: ${serverlessProductTiers.join(' | ')}`,
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

    // UIAM rules:
    //  - stateful never uses UIAM, so `uiam: true` is invalid;
    //  - on cloud, UIAM behavior is fixed (UIAM-only on serverless,
    //    never on stateful) and cannot be overridden;
    //  - locally, any boolean is allowed so TS server config sets under
    //    `servers/configs/config_sets/**` can drive the value via
    //    `esServerlessOptions.uiam` (and round-trip through `local.json`).
    if (!cfg.serverless && cfg.uiam === true) {
      ctx.addIssue({
        code: 'custom',
        path: ['uiam'],
        message: `must not be true when 'serverless' is false; UIAM is only available for serverless deployments`,
      });
    }
    if (cfg.isCloud && cfg.uiam !== undefined && cfg.uiam !== cfg.serverless) {
      ctx.addIssue({
        code: 'custom',
        path: ['uiam'],
        message:
          `must equal '${cfg.serverless}' (matches 'serverless') when 'isCloud' is true; ` +
          `UIAM behavior on Elastic Cloud cannot be overridden`,
      });
    }
  })
  .transform((cfg) => ({
    ...cfg,
    uiam: cfg.uiam ?? cfg.serverless,
  }));

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
