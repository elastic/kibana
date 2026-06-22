/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KbApiDefinition } from './types'
import type { ParsedResult } from '../factory'
import type { KibanaRequestParams } from '../lib/kibana-client'

/**
 * Builds a `KibanaRequestParams` object from an API definition and parsed CLI input.
 *
 * Routing:
 * - `pathParams` → interpolated into the URL path template
 * - `queryParams` → sent as querystring params
 * - `bodyParams` → collected into the JSON request body
 *
 * @param def - the API definition describing the Kibana endpoint
 * @param parsed - the CLI-parsed result; all API params live in `parsed.input`
 * @returns `KibanaRequestParams` ready to pass to `KibanaClient.request()`
 */
export function buildKibanaRequestParams (
  def: KbApiDefinition,
  parsed: ParsedResult
): KibanaRequestParams {
  const input = (parsed.input ?? {}) as Record<string, unknown>

  const path = interpolatePath(def, input)
  const querystring = buildQuerystring(def, input)

  const params: KibanaRequestParams = { method: def.method, path }
  if (Object.keys(querystring).length > 0) params.querystring = querystring

  if (def.requestType === 'multipart') {
    const fields = collectMultipartFields(def, input)
    if (fields != null) params.multipartFields = fields
  } else {
    const body = collectBody(def, input)
    if (body !== undefined) params.body = body
  }

  return params
}

/**
 * Interpolates `{param}` tokens in the path template.
 */
function interpolatePath (
  def: KbApiDefinition,
  input: Record<string, unknown>
): string {
  let path = def.path
  for (const param of def.pathParams ?? []) {
    const value = input[param.name]
    if (value !== undefined) {
      path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)))
    } else if (!param.required) {
      path = path.replace(new RegExp(`/?\\{${param.name}\\}/?`), '')
      path = path.replace(/\/$/, '') || '/'
    }
  }
  return path
}

/**
 * Builds the querystring record from query params.
 */
function buildQuerystring (
  def: KbApiDefinition,
  input: Record<string, unknown>
): Record<string, unknown> {
  const qs: Record<string, unknown> = {}
  for (const param of def.queryParams ?? []) {
    const key = param.cliFlag ?? param.name
    const value = input[key]
    if (value !== undefined) qs[param.name] = value
  }
  return qs
}

/**
 * Collects multipart form fields from body params.
 * Each body param value is treated as a string (file path or literal value).
 * Returns `undefined` when no fields are present.
 */
function collectMultipartFields (
  def: KbApiDefinition,
  input: Record<string, unknown>
): Record<string, string> | undefined {
  const fields: Record<string, string> = {}
  for (const param of def.bodyParams ?? []) {
    const key = param.cliFlag ?? param.name
    const value = input[key]
    if (value !== undefined) fields[param.name] = String(value)
  }
  return Object.keys(fields).length === 0 ? undefined : fields
}

/**
 * Collects request body fields from body params.
 * Returns `undefined` when no body fields are present.
 */
function collectBody (
  def: KbApiDefinition,
  input: Record<string, unknown>
): Record<string, unknown> | undefined {
  const bodyParamNames = (def.bodyParams ?? []).map((p) => p.name)
  if (bodyParamNames.length === 0) {
    // No explicit body params — check for any remaining input keys
    // not consumed by path/query params (freeform body).
    const pathKeys = new Set((def.pathParams ?? []).map((p) => p.name))
    const queryKeys = new Set((def.queryParams ?? []).map((p) => p.cliFlag ?? p.name))
    const body: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (!pathKeys.has(key) && !queryKeys.has(key) && value !== undefined) {
        body[key] = value
      }
    }
    return Object.keys(body).length === 0 ? undefined : body
  }

  const body: Record<string, unknown> = {}
  for (const param of def.bodyParams!) {
    const key = param.cliFlag ?? param.name
    const value = input[key]
    if (value !== undefined) body[param.name] = value
  }
  return Object.keys(body).length === 0 ? undefined : body
}
