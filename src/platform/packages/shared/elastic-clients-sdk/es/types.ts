/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { z } from '@kbn/zod/v4'
import { extractSchemaArgs } from '../lib/schema-args'
import type { SchemaArgDefinition } from '../lib/schema-args'

/**
 * Valid HTTP methods for Elasticsearch API requests.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'

/**
 * Declarative description of a single Elasticsearch API endpoint.
 *
 * Each definition specifies the HTTP method, path template, and an optional unified
 * `input` schema where every field carries `.meta({found_in: "path"|"query"|"body"})`
 * routing metadata. The generic handler derives its routing behavior entirely from
 * that metadata at runtime.
 *
 * Definitions with a `namespace` are grouped into per-namespace arrays (e.g. `catApis`) and
 * collected by the barrel module (`src/es/apis.ts`).
 *
 * @example
 * ```ts
 * // namespaced: registers as `elastic stack es indices create`
 * const createDef: EsApiDefinition = {
 *   name: 'create',
 *   namespace: 'indices',
 *   description: 'Creates an index',
 *   method: 'PUT',
 *   path: '/{index}',
 *   input: z.looseObject({
 *     index:    z.string().describe('Target index').meta({ found_in: 'path' }),
 *     pretty:   z.boolean().optional().meta({ found_in: 'query' }),
 *     settings: z.record(z.string(), z.unknown()).optional().meta({ found_in: 'body' }),
 *   }),
 * }
 *
 * // namespace-less: registers as `elastic stack es search`
 * const searchDef: EsApiDefinition = {
 *   name: 'search',
 *   description: 'Run a search',
 *   method: 'GET',
 *   path: '/_search',
 * }
 * ```
 */
export interface EsApiDefinition {
  /** kebab-case command name (e.g. `"health"`, `"create"`, `"put-mapping"`) */
  name: string
  /**
   * ES namespace (e.g. `"cat"`, `"indices"`) -- determines the parent group in the command tree.
   * When omitted, the command is registered as a direct leaf of the `es` group.
   */
  namespace?: string
  /** human-readable description for `--help` text */
  description: string
  /** HTTP method */
  method: HttpMethod
  /** URL path template; path parameters use `{param}` syntax */
  path: string
  /**
   * Unified Zod object schema (or a no-arg factory that returns one).
   * Every top-level field represents one parameter.
   * Fields with `.meta({found_in: "path"})` are interpolated into the URL path.
   * Fields with `.meta({found_in: "query"})` are sent as querystring params.
   * Fields with `.meta({found_in: "body"})` (or no `found_in`) are sent in the body.
   *
   * Use `z.looseObject()` when body fields may include underscore-prefixed keys
   * that cannot be valid CLI flags and must be supplied via `--file`/stdin.
   *
   * Use the factory form (`() => SomeRequest`) when the schema is imported from a
   * file that participates in circular module dependencies -- this defers schema
   * resolution to call time (after all modules have initialised) and avoids TDZ errors.
   */
  input?: z.ZodObject<z.ZodRawShape> | (() => z.ZodObject<z.ZodRawShape>)
  /** how to handle the response body; defaults to `"json"` */
  responseType?: 'json' | 'text'
  /** how to serialize the request body; defaults to `"json"` */
  bodyFormat?: 'json' | 'ndjson'
}

/** valid command/namespace name: lowercase alphanumeric with hyphens (from `defineCommand` rules) */
const VALID_NAME = /^[a-z0-9][a-z0-9-]*$/

/** valid namespace name: starts with lowercase letter, lowercase alphanumeric and hyphens */
const VALID_NAMESPACE = /^[a-z][a-z-]*$/

/** extracts all `{param}` tokens from a path template */
function extractPathTokens (path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] as string)
}

/**
 * Validates an `EsApiDefinition` against the data-model rules.
 *
 * Checks:
 * - `name` matches `/^[a-z0-9][a-z0-9-]*$/`
 * - `namespace`, if present, matches `/^[a-z][a-z-]*$/`
 * - `path` starts with `/`
 * - if `input` is provided:
 *   - every `{param}` token in the path has a corresponding field with `found_in: "path"`
 *   - every field with `found_in: "path"` has a matching `{param}` token in the path
 *
 * @throws {Error} if any validation rule is violated
 */
export function validateApiDefinition (def: EsApiDefinition): SchemaArgDefinition[] {
  if (!VALID_NAME.test(def.name)) {
    throw new Error(
 `invalid name ${JSON.stringify(def.name)}: ` +
 'names must start with a lowercase letter or digit and contain only lowercase letters, digits, and hyphens'
    )
  }

  if (def.namespace !== undefined && !VALID_NAMESPACE.test(def.namespace)) {
    throw new Error(
 `invalid namespace ${JSON.stringify(def.namespace)}: ` +
 'namespaces must start with a lowercase letter and contain only lowercase letters and hyphens'
    )
  }

  if (!def.path.startsWith('/')) {
    throw new Error(`path must start with "/" -- got ${JSON.stringify(def.path)}`)
  }

  if (def.input == null) return []

  const tokens = new Set(extractPathTokens(def.path))
  const args = extractSchemaArgs(resolveInput(def.input))
  const pathFields = new Set(args.filter((a) => a.foundIn === 'path').map((a) => a.schemaKey))

  for (const token of tokens) {
    if (!pathFields.has(token)) {
      throw new Error(
 `path param {${token}} in definition "${def.name}" has no input field with found_in: "path" -- ` +
 `add .meta({ found_in: "path" }) to the "${token}" field in the input schema`
      )
    }
  }

  for (const key of pathFields) {
    if (!tokens.has(key)) {
      throw new Error(
 `input field "${key}" has found_in: "path" but there is no {${key}} token in the path template for definition "${def.name}"`
      )
    }
  }

  return args
}
