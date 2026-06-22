/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** Valid HTTP methods for Kibana API requests. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'

/**
 * Describes a path parameter that gets interpolated into the URL template.
 */
export interface KbPathParam {
  name: string
  description: string
  required: boolean
}

/**
 * Describes a query string parameter for a Kibana API request.
 *
 * The `name` field (snake_case) is used in the query string;
 * the `cliFlag` (kebab-case) is what users type on the command line.
 */
export interface KbQueryParam {
  name: string
  cliFlag?: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required?: boolean
}

/**
 * Describes a request body parameter for a Kibana API request.
 */
export interface KbBodyParam {
  name: string
  cliFlag?: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
}

/**
 * Declarative description of a single Kibana API endpoint.
 *
 * Follows the same shape as `CloudApiDefinition` — path params, query params,
 * and body params are plain objects rather than Zod schemas. Zod is built at
 * registration time by `register.ts`.
 *
 * @example
 * ```ts
 * const getDef: KbApiDefinition = {
 *   name: 'get',
 *   namespace: 'data-views',
 *   description: 'Get a data view by ID.',
 *   method: 'GET',
 *   path: '/api/data_views/data_view/{viewId}',
 *   pathParams: [
 *     { name: 'viewId', description: 'Data view ID', required: true },
 *   ],
 * }
 * ```
 */
export interface KbApiDefinition {
  name: string
  namespace: string
  description: string
  method: HttpMethod
  path: string
  pathParams?: KbPathParam[]
  queryParams?: KbQueryParam[]
  bodyParams?: KbBodyParam[]
  /** When 'multipart', the request body must be sent as multipart/form-data. */
  requestType?: 'multipart'
  /** When 'ndjson', the success response is newline-delimited JSON (parsed into an array). */
  responseType?: 'ndjson'
}

const VALID_NAME = /^[a-z0-9][a-z0-9-]*$/
const VALID_NAMESPACE = /^[a-z][a-z0-9-]*$/

function extractPathTokens (path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] as string)
}

/**
 * Validates a `KbApiDefinition` against the data-model rules.
 *
 * @throws {Error} if any validation rule is violated
 */
export function validateKbApiDefinition (def: KbApiDefinition): void {
  if (!VALID_NAME.test(def.name)) {
    throw new Error(
      `invalid name ${JSON.stringify(def.name)}: ` +
      'names must start with a lowercase letter or digit and contain only lowercase letters, digits, and hyphens'
    )
  }

  if (!VALID_NAMESPACE.test(def.namespace)) {
    throw new Error(
      `invalid namespace ${JSON.stringify(def.namespace)}: ` +
      'namespaces must start with a lowercase letter and contain only lowercase letters, digits, and hyphens'
    )
  }

  if (!def.path.startsWith('/')) {
    throw new Error(`path must start with "/" — got ${JSON.stringify(def.path)}`)
  }

  const tokens = extractPathTokens(def.path)
  const paramNames = new Set((def.pathParams ?? []).map((p) => p.name))

  for (const token of tokens) {
    if (!paramNames.has(token)) {
      throw new Error(
        `path param {${token}} is not defined in pathParams for definition ${JSON.stringify(def.name)}`
      )
    }
  }
}
