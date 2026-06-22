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

import { buildRequestParams as buildEsRequestParams } from '../es/request-builder';
import type { EsApiDefinition } from '../es/types';
import type { SchemaArgDefinition } from '../lib/schema-args';
import type { ApiRegistryDefinition } from './registry';

/**
 * Transport-ready request parameters produced by {@link buildRequestParams}.
 *
 * Mirrors the subset of `@elastic/transport`'s `TransportRequestParams` that the routing
 * logic populates, but narrows `querystring` to an object map (this code path never emits a
 * pre-encoded querystring string) so callers can forward the result straight to
 * `transport.request()`.
 */
export interface ApiRequestParams {
  /** HTTP method. */
  method: string;
  /** Fully interpolated URL path. */
  path: string;
  /** Querystring parameters keyed by their target-native name. */
  querystring?: Record<string, unknown>;
  /** Request body, either a structured object or a pre-serialized JSON string. */
  body?: unknown;
  /** Newline-delimited body for bulk/msearch-style endpoints. */
  bulkBody?: unknown;
}

/**
 * Assembles an {@link ApiRequestParams} object from an {@link ApiRegistryDefinition}, a flat
 * map of parameter values, and the schema arg definitions extracted from the definition's
 * `input` schema (via {@link extractSchemaArgs}).
 *
 * Each `SchemaArgDefinition` carries a `foundIn` field that determines routing:
 * - `"path"` → interpolated into the URL path template
 * - `"query"` → added to the querystring
 * - `"body"` (or unset) → collected into the request body
 *
 * Unlike the CLI-internal builder, `params` is a plain `{ [key]: value }` map (keyed by the
 * schema field names), so callers can pass values straight through without constructing a
 * full CLI `ParsedResult`.
 *
 * @param def - the API definition describing the endpoint
 * @param params - flat map of parameter values keyed by schema field name
 * @param schemaArgs - arg definitions extracted from `def.input`
 * @returns request params ready to pass to `transport.request()`
 */
export function buildRequestParams(
  def: ApiRegistryDefinition,
  params: Record<string, unknown>,
  schemaArgs: SchemaArgDefinition[]
): ApiRequestParams {
  const built = buildEsRequestParams(
    def as unknown as EsApiDefinition,
    { options: {}, input: params },
    schemaArgs
  );

  const result: ApiRequestParams = { method: built.method, path: built.path };
  if (built.querystring != null) {
    result.querystring = built.querystring as Record<string, unknown>;
  }
  if (built.bulkBody != null) {
    result.bulkBody = built.bulkBody;
  } else if (built.body != null) {
    result.body = built.body;
  }
  return result;
}

/**
 * Resolves `def.input` to a concrete `ZodObject`, calling the factory thunk if necessary.
 * All consumer code should use this instead of accessing `def.input` directly.
 */
export function resolveInput (
  input: z.ZodObject<z.ZodRawShape> | (() => z.ZodObject<z.ZodRawShape>)
): z.ZodObject<z.ZodRawShape> {
  return typeof input === 'function' ? input() : input
}
