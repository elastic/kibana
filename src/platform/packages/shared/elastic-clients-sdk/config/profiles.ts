/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Built-in command profiles for deployment-aware API surface filtering.
 *
 * A profile resolves to an effective allow-list at config load time,
 * which then flows through the same `isCommandAllowed` / `hideBlockedCommands`
 * path as the manual `commands.allowed` policy.
 *
 * Built-in profiles:
 * - `serverless` — only commands that work on Elastic Serverless. Hides
 *   `cloud hosted` and exposes `cloud serverless` + all stack commands.
 * - `stack`      — full surface including self-managed / hosted-only APIs.
 *                  Equivalent to having no policy (allow everything).
 * - `default`    — alias for `serverless`; the most conservative baseline,
 *                  recommended for agents and LLM-based tooling.
 */

/** The set of valid built-in profile names. */
export const BUILT_IN_PROFILES = ['serverless', 'stack', 'default'] as const

/** Union of valid built-in profile name strings. */
export type BuiltInProfile = typeof BUILT_IN_PROFILES[number]

/**
 * Resolves a built-in profile to an effective allow-list.
 *
 * Returns `null` for `stack`, which means "no restriction" (allow everything).
 * Returns an object with `allowed` patterns for all other profiles.
 */
export function resolveBuiltinProfile (name: BuiltInProfile): { allowed: readonly string[] } | null {
  if (name === 'stack') return null

  // `default` is an alias for `serverless`
  return {
    allowed: [
      // CLI utilities — always visible regardless of deployment type
      'version',
      'docs.*',
      'config.*',
      'sanitize.*',

      // Top-level es/kb alias stubs (leaf nodes that redirect to stack.es/stack.kb)
      'es',
      'kb',

      // All stack commands (Elasticsearch + Kibana)
      // Individual serverless-incompatible ES endpoints will be filtered in a
      // future iteration once per-command availability metadata is added to the
      // API manifest (see issue #283 for tracking).
      'stack.*',

      // Cloud cross-cutting namespaces (apply to both Hosted and Serverless)
      'cloud.trust.*',
      'cloud.auth.*',
      'cloud.orgs.*',
      'cloud.users.*',
      'cloud.billing.*',

      // Cloud Serverless management
      'cloud.serverless.*',

      // cloud.hosted.* is intentionally excluded from serverless/default profiles
    ],
  }
}
