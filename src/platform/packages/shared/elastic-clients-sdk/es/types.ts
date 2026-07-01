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

import type { JsonSchemaObject } from '../lib/json_schema';

/**
 * Valid HTTP methods for Elasticsearch API requests.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';

/**
 * Declarative description of a single Elasticsearch API endpoint.
 *
 * Each definition specifies the HTTP method, path template, and an optional
 * JSON Schema `input` where every top-level property carries an `x-found-in`
 * annotation (`"path"`, `"query"`, or `"body"`) that determines routing.
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
 *   input: {
 *     type: 'object',
 *     properties: {
 *       index:    { type: 'string', description: 'Target index', 'x-found-in': 'path' },
 *       pretty:   { type: 'boolean', 'x-found-in': 'query' },
 *       settings: { type: 'object', 'x-found-in': 'body' },
 *     },
 *     required: ['index'],
 *   },
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
   * JSON Schema object describing all accepted parameters.
   * Every top-level property under `properties` must carry an `x-found-in` annotation:
   * - `"path"` → interpolated into the URL path template
   * - `"query"` → sent as a URL querystring parameter
   * - `"body"` → included in the request body (default when absent)
   */
  input?: JsonSchemaObject;
  /** how to handle the response body; defaults to `"json"` */
  responseType?: 'json' | 'text';
  /** how to serialize the request body; defaults to `"json"` */
  bodyFormat?: 'json' | 'ndjson';
}
