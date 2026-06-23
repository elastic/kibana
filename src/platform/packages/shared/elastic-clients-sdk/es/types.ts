/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { z } from '@kbn/zod/v4';

/**
 * Valid HTTP methods for Elasticsearch API requests.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';

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
  name: string;
  /**
   * ES namespace (e.g. `"cat"`, `"indices"`) -- determines the parent group in the command tree.
   * When omitted, the command is registered as a direct leaf of the `es` group.
   */
  namespace?: string;
  /** human-readable description for `--help` text */
  description: string;
  /** HTTP method */
  method: HttpMethod;
  /** URL path template; path parameters use `{param}` syntax */
  path: string;
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
  input?: z.ZodObject<z.ZodRawShape> | (() => z.ZodObject<z.ZodRawShape>);
  /** how to handle the response body; defaults to `"json"` */
  responseType?: 'json' | 'text';
  /** how to serialize the request body; defaults to `"json"` */
  bodyFormat?: 'json' | 'ndjson';
}
