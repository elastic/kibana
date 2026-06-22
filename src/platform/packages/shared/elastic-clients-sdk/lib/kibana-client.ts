/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs'
import path from 'node:path'
import { getResolvedConfig } from '../config/store'
import { isLoopbackUrl } from './is-loopback-host'

export type KibanaHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH'

/**
 * Parameters for a single Kibana API request.
 */
export interface KibanaRequestParams {
  method: KibanaHttpMethod
  path: string
  querystring?: Record<string, unknown>
  body?: unknown
  /** When set, the request is sent as multipart/form-data. Keys map to form field names; string values that resolve to an existing file path are sent as file uploads. */
  multipartFields?: Record<string, string>
}

/**
 * Lightweight HTTP client for Kibana APIs.
 *
 * Uses the native `fetch` API (like `CloudClient`) rather than `@elastic/transport`,
 * since the Kibana API is a standard REST service with no ES-specific requirements.
 *
 * Differences from `CloudClient`:
 * - Supports both API key and basic (username/password) auth
 * - Automatically adds the `kbn-xsrf: true` header for non-GET/HEAD requests,
 *   which Kibana requires to protect against CSRF
 */
export class KibanaClient {
  readonly baseUrl: string
  private readonly authHeader: string | undefined
  private _fetch: typeof fetch = globalThis.fetch

  constructor (baseUrl: string, auth?: { api_key: string } | { username: string; password: string }) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    if (auth == null) {
      this.authHeader = undefined
    } else if ('api_key' in auth) {
      this.authHeader = `ApiKey ${auth.api_key}`
    } else {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
      this.authHeader = `Basic ${encoded}`
    }
    if (this.baseUrl.startsWith('http://') && !isLoopbackUrl(this.baseUrl)) {
      process.stderr.write('Warning: using plaintext HTTP. Credentials will be sent unencrypted.\n')
    }
  }

  /**
   * Sends an HTTP request to the Kibana API and returns the parsed JSON response.
   *
   * @throws {Error} on non-2xx responses, including the status code and response body
   */
  async request (params: KibanaRequestParams): Promise<unknown> {
    let url = `${this.baseUrl}${params.path}`

    if (params.querystring != null && Object.keys(params.querystring).length > 0) {
      const pieces = Object.entries(params.querystring)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      url += `?${pieces}`
    }

    const method = params.method.toUpperCase()
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    if (this.authHeader != null) {
      headers['Authorization'] = this.authHeader
    }

    // Kibana requires kbn-xsrf for all state-mutating requests to protect against CSRF
    if (method !== 'GET' && method !== 'HEAD') {
      headers['kbn-xsrf'] = 'true'
    }

    const init: RequestInit = { method, headers, redirect: 'error' }

    if (params.multipartFields != null) {
      // Send as multipart/form-data; do NOT set Content-Type manually (fetch sets it with the boundary)
      const form = new FormData()
      for (const [field, value] of Object.entries(params.multipartFields)) {
        const resolved = path.resolve(value)
        if (fs.existsSync(resolved)) {
          const blob = new Blob([fs.readFileSync(resolved)], { type: 'application/octet-stream' })
          form.append(field, blob, path.basename(resolved))
        } else {
          form.append(field, value)
        }
      }
      init.body = form
    } else if (params.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(params.body)
    }

    const response = await this._fetch(url, init)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Kibana API error ${response.status}: ${text}`)
    }

    const text = await response.text()
    if (text.length === 0) return {}

    // application/x-ndjson: parse each non-empty line as a JSON object
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('ndjson')) {
      return text.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l))
    }

    return JSON.parse(text)
  }

  /**
   * @internal test seam — replaces the fetch implementation for unit tests
   */
  _testSetFetch (fn: typeof fetch): void {
    this._fetch = fn
  }
}

let _client: KibanaClient | undefined

/**
 * Returns a lazily-created, cached `KibanaClient` configured from the
 * resolved config context's `kibana` service block.
 *
 * Supports both API key and basic (username/password) authentication.
 *
 * @throws {Error} with `missing_config` when no Kibana service is configured or auth is invalid
 */
export function getKibanaClient (): KibanaClient {
  if (_client != null) return _client

  const config = getResolvedConfig()
  const kb = config?.context.kibana

  if (kb == null) {
    throw new Error(
      'missing_config: No Kibana connection configured in the active context. ' +
      'Add a kibana block to your .elasticrc.yml config file.'
    )
  }

  const { url, auth } = kb
  const authRecord = auth as Record<string, unknown> | undefined

  let typedAuth: { api_key: string } | { username: string; password: string } | undefined
  if (typeof authRecord?.['api_key'] === 'string') {
    typedAuth = { api_key: authRecord['api_key'] as string }
  } else if (typeof authRecord?.['username'] === 'string' && typeof authRecord?.['password'] === 'string') {
    typedAuth = { username: authRecord['username'] as string, password: authRecord['password'] as string }
  }
  // auth is optional — when absent (e.g. security disabled), requests are sent without credentials

  _client = new KibanaClient(url, typedAuth)
  return _client
}

/**
 * Resets the cached KibanaClient instance.
 *
 * @internal test seam — call in `afterEach` to prevent instance reuse across tests
 */
export function _testResetKibanaClient (): void {
  _client = undefined
}
