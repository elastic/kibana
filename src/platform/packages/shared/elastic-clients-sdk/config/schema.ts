/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod'
import { BUILT_IN_PROFILES } from './profiles'

/**
 * Zod schemas for configuration file validation.
 *
 * Schemas are organized from bottom-up:
 * 1. Auth schemas: inferred union (api_key | basic) -- type is inferred from present fields
 * 2. ServiceBlock schema: url + auth
 * 3. Context schema: at least one service block (elasticsearch/kibana/cloud)
 * 4. ConfigFile root schema: current_context + contexts map (z.record) + cross-field refinement
 *
 * All schemas use `z.object()` so unknown fields are stripped during parsing.
 * Refinements enforce business rules (at-least-one-service, non-empty contexts map, valid current_context key).
 */

/** API key authentication credentials. Auth type is inferred from the presence of `api_key`. */
export const ApiKeyAuthSchema = z.object({
  api_key: z.string().min(1)
})

/** Basic (username + password) authentication credentials. Auth type is inferred from the presence of `username` and `password`. */
export const BasicAuthSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

/** Union of all supported auth variants -- type is inferred from whichever fields are present. */
export const AuthSchema = z.union([ApiKeyAuthSchema, BasicAuthSchema])

/** Endpoint URL and authentication credentials for a single service. */
export const ServiceBlockSchema = z.object({
  url: z.string().url().refine(
    (u) => u.startsWith('https://') || u.startsWith('http://'),
    { message: 'URL must use http:// or https:// scheme' }
  ),
  auth: AuthSchema.optional()
})

/**
 * Policy controlling which commands are permitted to run.
 *
 * Mutually exclusive combinations:
 * - `profile` and `allowed` cannot both be set (profile replaces the allow-list)
 * - `allowed` and `blocked` cannot both be set
 *
 * Valid combinations:
 * - `profile` alone — use a built-in allow-list
 * - `profile` + `blocked` — built-in allow-list with additional restrictions
 * - `allowed` alone — explicit allow-list
 * - `blocked` alone — explicit deny-list (everything else is allowed)
 *
 * Entries may use a trailing wildcard (e.g. `stack.es.*`) to match a namespace.
 */
export const CommandPolicySchema = z
  .object({
    profile: z.enum(BUILT_IN_PROFILES).optional(),
    allowed: z.array(z.string().min(1)).min(1).optional(),
    blocked: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(
    (p) => !(p.profile != null && p.allowed != null),
    { error: 'commands: "profile" and "allowed" are mutually exclusive' },
  )
  .refine(
    (p) => !(p.allowed != null && p.blocked != null),
    { error: 'commands: "allowed" and "blocked" are mutually exclusive' },
  )

/**
 * A context value: optional service blocks with at least one present, plus
 * an optional per-context command policy that overrides the root-level policy.
 */
export const ContextSchema = z
  .object({
    elasticsearch: ServiceBlockSchema.optional(),
    kibana: ServiceBlockSchema.optional(),
    cloud: ServiceBlockSchema.optional(),
    commands: CommandPolicySchema.optional(),
  })
  .refine(
    (ctx) => ctx.elasticsearch != null || ctx.kibana != null || ctx.cloud != null,
    { error: 'at least one service block (elasticsearch, kibana, or cloud) is required' }
  )

/**
 * The root configuration file structure.
 *
 * `default_profile` sets a fallback profile for all contexts that don't
 * specify their own `commands.profile`. It is overridden by a per-context
 * `commands.profile` and by the `--profile` CLI flag.
 *
 * `commands` is the root-level policy; per-context `commands` takes precedence.
 */
export const ConfigFileSchema = z
  .object({
    current_context: z.string().min(1),
    contexts: z.record(z.string(), ContextSchema).refine(
      (map) => Object.keys(map).length > 0,
      { error: 'contexts must contain at least one entry' },
    ),
    commands: CommandPolicySchema.optional(),
    default_profile: z.enum(BUILT_IN_PROFILES).optional(),
    banner: z.boolean().optional(),
  })
  .refine(
    (cfg) => cfg.current_context in cfg.contexts,
    { error: 'current_context must reference an existing context key' }
  )

/**
 * Structural schema for first-pass validation before expression resolution.
 * Validates the outer config shape (current_context, contexts keys, commands)
 * without deeply validating context values (which may contain unresolved expressions).
 */
export const StructuralConfigSchema = z
  .object({
    current_context: z.string().min(1),
    contexts: z.record(z.string(), z.record(z.string(), z.unknown())).refine(
      (map) => Object.keys(map).length > 0,
      { error: 'contexts must contain at least one entry' },
    ),
    commands: z.unknown().optional(),
    default_profile: z.unknown().optional(),
    banner: z.boolean().optional(),
  })
