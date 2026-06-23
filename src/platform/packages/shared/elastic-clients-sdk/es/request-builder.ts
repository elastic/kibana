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

import type { TransportRequestParams } from '@elastic/transport';
import type { EsApiDefinition } from './types';
import type { SchemaArgDefinition } from '../lib/schema-args';

/** Minimal shape of a raw JSON value passed through from the CLI. */
interface RawJsonValue {
  raw: string;
}

/**
 * Builds a `TransportRequestParams` object from an API definition, a flat input map,
 * and the schema arg definitions extracted from `def.input`.
 *
 * Each `SchemaArgDefinition` carries a `foundIn` field that determines routing:
 * - `"path"` → value is interpolated into the URL path template
 * - `"query"` → value is added to the querystring (key = `schemaKey`, the snake_case ES name)
 * - `"body"` or `undefined` → value is collected into the request body object
 *
 * Input keys must match the schema keys (snake_case ES names); no key translation is done.
 *
 * @param def - the API definition describing the endpoint
 * @param input - flat map of parameter values keyed by schema key
 * @param schemaArgs - arg definitions extracted from `def.input` at registration time
 * @param rawBody - optional map of pre-serialized JSON values (from CLI JSON parsing)
 * @returns `TransportRequestParams` ready to pass to `transport.request()`
 */
export function buildRequestParams(
  def: EsApiDefinition,
  input: Record<string, unknown>,
  schemaArgs: SchemaArgDefinition[],
  rawBody: Record<string, RawJsonValue> = {}
): TransportRequestParams {
  const path = interpolatePath(def.path, schemaArgs, input);
  const querystring = buildQuerystring(schemaArgs, input);
  const body = collectBody(schemaArgs, input, rawBody, def.path, def.bodyFormat);

  // The index API uses PUT with {id} but POST without (auto-ID generation).
  // Only switch PUT→POST for paths containing /{id} when id is omitted.
  let method = def.method;
  if (method === 'PUT' && def.path.includes('/{id}')) {
    const idArg = schemaArgs.find(
      (a) => a.schemaKey === 'id' && a.foundIn === 'path' && !a.required
    );
    if (idArg != null && input[idArg.schemaKey] === undefined) method = 'POST';
  }

  const params: TransportRequestParams = { method, path };
  if (Object.keys(querystring).length > 0) params.querystring = querystring;

  if (body !== undefined) {
    if (typeof body === 'string') {
      params.body = body;
    } else if (def.bodyFormat === 'ndjson') {
      params.bulkBody = toNdjson(body);
    } else {
      params.body = body as NonNullable<TransportRequestParams['body']>;
    }
  }
  return params;
}

/**
 * Interpolates `{param}` tokens in the path template using values from the unified input object.
 *
 * Only `SchemaArgDefinition` entries with `foundIn === "path"` are processed.
 * The schema key is both the `{token}` name in the template and the lookup key in `input`.
 * For optional params that are absent, trailing `/{param}` segments are stripped.
 */
/**
 * Encodes a single path parameter value. Splits on commas so ES multi-target
 * syntax (e.g. "idx1,idx2") is preserved, while special characters like `/`,
 * `?`, and `#` are percent-encoded to prevent path traversal (#106).
 */
function encodePathParam(value: string): string {
  return value
    .split(',')
    .map((s) => encodeURIComponent(s.trim()))
    .join(',');
}

function interpolatePath(
  path: string,
  schemaArgs: SchemaArgDefinition[],
  input: Record<string, unknown>
): string {
  for (const arg of schemaArgs.filter((a) => a.foundIn === 'path')) {
    const value = input[arg.schemaKey];
    if (value !== undefined) {
      path = path.replace(`{${arg.schemaKey}}`, encodePathParam(String(value)));
    } else if (!arg.required) {
      // Strip the optional segment with its leading slash so the rest of the
      // path remains valid. E.g.:
      //   "/_inference/{task_type}/{inference_id}" (task_type absent)
      //   → "/_inference/{inference_id}"   (not "/_inference{inference_id}")
      path = path.replace(new RegExp(`/\\{${arg.schemaKey}\\}`), '');
      path = path.replace(/\/$/, '') || '/';
    }
  }
  return path;
}

/**
 * Builds the querystring record from `SchemaArgDefinition` entries with `foundIn === "query"`.
 * The schema key is used as the ES-native querystring param name.
 */
function buildQuerystring(
  schemaArgs: SchemaArgDefinition[],
  input: Record<string, unknown>
): Record<string, unknown> {
  const qs: Record<string, unknown> = {};
  for (const arg of schemaArgs.filter((a) => a.foundIn === 'query')) {
    const value = input[arg.schemaKey];
    if (value !== undefined) qs[arg.schemaKey] = value;
  }
  return qs;
}

/**
 * Serializes a body object into NDJSON format for bulk/msearch APIs.
 *
 * Finds the first array-valued field in the body and emits each element as
 * a separate JSON line. If no array field is found, the body itself is
 * serialized as a single JSON line. The result always ends with a trailing
 * newline as required by Elasticsearch.
 */
function toNdjson(body: Record<string, unknown>): string {
  for (const value of Object.values(body)) {
    if (Array.isArray(value)) {
      return value.map((item) => JSON.stringify(item)).join('\n') + '\n';
    }
  }
  return JSON.stringify(body) + '\n';
}

// Fields whose value should replace the entire request body (not nested under the key).
// Mapped per-field to the set of API paths where unwrapping applies, or '*' for all.
const BODY_ROOT_FIELDS: Record<string, Set<string> | '*'> = {
  document: '*',
  inference_config: '*',
  mappings: new Set(['/_data_stream/{name}/_mappings']),
  settings: new Set(['/_data_stream/{name}/_settings']),
  pipeline: new Set(['/_logstash/pipeline/{id}']),
};

/**
 * Collects request body fields from entries with `foundIn === "body"` or no `foundIn`.
 * Returns `undefined` when no body fields are present in the input.
 *
 * When a body value is a `RawJsonValue` (from CLI JSON parsing), the original
 * JSON string is preserved in the output so number formatting (e.g. `100.0`
 * for Painless floats) survives the round-trip.
 *
 * Special case: when the only body field with a value is in `BODY_ROOT_FIELDS`
 * (e.g. `document`), its value is promoted to be the entire body (#95).
 */
function collectBody(
  schemaArgs: SchemaArgDefinition[],
  input: Record<string, unknown>,
  rawBody: Record<string, RawJsonValue>,
  apiPath: string,
  bodyFormat?: string
): Record<string, unknown> | string | undefined {
  const bodyArgs = schemaArgs.filter((a) => a.foundIn === 'body' || a.foundIn === undefined);
  const body: Record<string, unknown> = {};

  for (const arg of bodyArgs) {
    const value = input[arg.schemaKey];
    if (value !== undefined) body[arg.schemaKey] = value;
  }

  if (Object.keys(body).length === 0) return undefined;

  const keys = Object.keys(body);
  if (keys.length === 1) {
    const key = keys[0]!;
    const rule = BODY_ROOT_FIELDS[key];
    if (rule === '*' || (rule instanceof Set && rule.has(apiPath))) {
      if (key in rawBody) return rawBody[key]!.raw;
      return body[key] as Record<string, unknown>;
    }
  }

  // If any body value has a raw JSON string, build a pre-serialized JSON body
  // so the transport sends it as-is (preserving number formatting like 100.0).
  // Skip for NDJSON bodies which must go through toNdjson().
  const hasRaw = bodyFormat !== 'ndjson' && bodyArgs.some((a) => a.schemaKey in rawBody);
  if (hasRaw) {
    const parts = keys.map((k) => {
      if (k in rawBody) return `${JSON.stringify(k)}:${rawBody[k]!.raw}`;
      return `${JSON.stringify(k)}:${JSON.stringify(body[k])}`;
    });
    return `{${parts.join(',')}}`;
  }

  return body;
}
