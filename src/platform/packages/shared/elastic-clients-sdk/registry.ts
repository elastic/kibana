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

import type { JsonSchemaObject } from './lib/json_schema';
import type { KbApiDefinition } from './kb/types';
import type { FoundIn } from './lib/schema_args';
import { extractSchemaArgs } from './lib/schema_args';
import { buildRequestParams as buildEsRequestParams } from './es/request_builder';
import { buildKibanaRequestParams } from './kb/request-builder';
import { apiManifest, loadEsApi } from './es/apis';
import type { EsApiMeta } from './es/apis';
import { kbApiManifest, loadKbApi } from './kb/apis';

/** HTTP methods accepted across both the Elasticsearch and Kibana API surfaces. */
export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

/**
 * Cheap, schema-free metadata for a single API operation.
 *
 * Every entry in {@link ApiRegistry.manifest} is one of these. It is intentionally
 * lightweight so callers can list/search the full API surface without paying the
 * cost of loading per-endpoint schemas. Pass an entry back to
 * {@link ApiRegistry.loadApi} to resolve its full definition on demand.
 */
export interface ApiRegistryMeta {
  /** Operation name (e.g. `"create"`, `"bulk"`). */
  readonly name: string;
  /** Namespace group (e.g. `"indices"`), or `null` for root-level operations. */
  readonly namespace: string | null;
  /** Short, human-readable description of the operation. */
  readonly description: string;
  /** Stable identifier of the file that holds the full definition; used as the API id. */
  readonly namespaceFile: string;
}

/**
 * A fully-resolved API definition, including the JSON Schema `input` (when the
 * operation accepts parameters).
 *
 * Every property under `input.properties` carries an `x-found-in` routing
 * annotation (`"path"`, `"query"`, or `"body"`), used by {@link api_manual} to
 * describe each parameter and by {@link api_execute} to route it correctly.
 *
 * Note: the `input` schema keys reflect the display representation. For ES they
 * are the wire/schema keys; for Kibana they are the `cliFlag ?? name` keys. Do
 * not use `input` to build HTTP requests — use {@link LoadedApi.buildRequest}
 * instead.
 */
export interface ApiRegistryDefinition {
  readonly name: string;
  readonly namespace?: string;
  readonly description: string;
  readonly method: ApiHttpMethod;
  readonly path: string;
  /** JSON Schema object describing accepted parameters; absent when the API takes no params. */
  readonly input?: JsonSchemaObject;
  /** How to serialize the request body; defaults to `"json"`. */
  readonly bodyFormat?: 'json' | 'ndjson';
  /** How to handle the response body; defaults to `"json"`. */
  readonly responseType?: 'json' | 'text' | 'ndjson';
}

/**
 * A normalized HTTP request ready to be dispatched to a target backend.
 *
 * Produced by {@link LoadedApi.buildRequest} and consumed by the API execute tool.
 * Fields are target-specific: `bulkBody` is ES-only; `multipartFields` is Kibana-only.
 */
export interface ApiRequest {
  readonly method: string;
  readonly path: string;
  readonly querystring?: Record<string, unknown>;
  readonly body?: any;
  /** ES-only: NDJSON-serialized body for bulk/msearch APIs. */
  readonly bulkBody?: any;
  /** Kibana-only: multipart/form-data fields. */
  readonly multipartFields?: Record<string, string>;
}

/**
 * A fully loaded API operation, combining the display-facing {@link ApiRegistryDefinition}
 * with a target-bound request builder.
 *
 * The {@link buildRequest} closure captures the raw, target-specific definition so it can
 * apply target-appropriate routing (e.g. Kibana's wire `name` vs `cliFlag` mapping, ES
 * `PUT→POST` auto-id logic, NDJSON serialization).
 */
export interface LoadedApi {
  /** The normalized definition used for display (api_manual). */
  readonly definition: ApiRegistryDefinition;
  /**
   * Builds a target-appropriate {@link ApiRequest} from a flat input map.
   *
   * @param input - flat map of parameter values. For ES: keyed by schema key (snake_case).
   *   For Kibana: keyed by `cliFlag ?? name`.
   */
  buildRequest: (input: Record<string, unknown>) => ApiRequest;
}

/**
 * A target-agnostic view over a generated client's API surface.
 *
 * - `manifest` lists every operation as cheap metadata (no schemas loaded).
 * - `loadApi(meta)` dynamic-imports and returns a {@link LoadedApi} for one operation.
 *
 * This is the contract consumed by generic API tooling that needs to discover,
 * document, and execute operations without hard-coding a specific target.
 */
export interface ApiRegistry {
  readonly manifest: readonly ApiRegistryMeta[];
  loadApi: (meta: ApiRegistryMeta) => Promise<LoadedApi>;
}

/** Registry over the Elasticsearch HTTP API surface. */
export const esApiRegistry: ApiRegistry = {
  manifest: apiManifest,
  loadApi: async (meta) => {
    const def = await loadEsApi(meta as EsApiMeta);
    return {
      definition: def as ApiRegistryDefinition,
      buildRequest: (input): ApiRequest => {
        const schemaArgs = def.input != null ? extractSchemaArgs(def.input) : [];
        const p = buildEsRequestParams(def, input, schemaArgs);
        const req: {
          method: string;
          path: string;
          querystring?: Record<string, unknown>;
          body?: unknown;
          bulkBody?: unknown;
        } = { method: p.method as string, path: p.path as string };
        if (p.querystring != null) req.querystring = p.querystring as Record<string, unknown>;
        if (p.bulkBody != null) req.bulkBody = p.bulkBody;
        else if (p.body != null) req.body = p.body;
        return req;
      },
    };
  },
};

/** Registry over the Kibana HTTP API surface. */
export const kbApiRegistry: ApiRegistry = {
  manifest: kbApiManifest,
  loadApi: async (meta) => {
    const rawDef = await loadKbApi(meta);
    return {
      definition: toRegistryDefinition(rawDef),
      buildRequest: (input): ApiRequest => {
        const p = buildKibanaRequestParams(rawDef, input);
        const req: {
          method: string;
          path: string;
          querystring?: Record<string, unknown>;
          body?: unknown;
          multipartFields?: Record<string, string>;
        } = { method: p.method, path: p.path };
        if (p.querystring != null) req.querystring = p.querystring;
        if (p.multipartFields != null) req.multipartFields = p.multipartFields;
        else if (p.body !== undefined) req.body = p.body;
        return req;
      },
    };
  },
};

/**
 * Normalizes a {@link KbApiDefinition} into the unified {@link ApiRegistryDefinition} shape
 * for display purposes (api_manual). The schema keys on `input` use `cliFlag ?? name`.
 */
function toRegistryDefinition(def: KbApiDefinition): ApiRegistryDefinition {
  return {
    name: def.name,
    namespace: def.namespace,
    description: def.description,
    method: def.method,
    path: def.path,
    input: buildKbRegistryInput(def),
  };
}

/**
 * Builds a JSON Schema object for a Kibana API definition.
 *
 * Each path, query, and body parameter becomes a property in the schema with
 * the appropriate `x-found-in` annotation and a JSON Schema type.
 *
 * This is a temporary shim until the Kibana API generator emits JSON Schema
 * directly (analogous to what the ES client generator now does).
 */
function buildKbRegistryInput(def: KbApiDefinition): JsonSchemaObject | undefined {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  const addParam = (
    key: string,
    kbType: string | undefined,
    description: string,
    foundIn: FoundIn,
    isRequired: boolean
  ) => {
    let jsonType: string;
    switch (kbType) {
      case 'boolean':
        jsonType = 'boolean';
        break;
      case 'number':
        jsonType = 'number';
        break;
      case 'array':
        jsonType = 'array';
        break;
      case 'object':
        jsonType = 'object';
        break;
      default:
        jsonType = 'string';
    }
    properties[key] = {
      type: jsonType,
      description,
      'x-found-in': foundIn,
    };
    if (isRequired) required.push(key);
  };

  for (const p of def.pathParams ?? []) {
    addParam(p.name, 'string', p.description, 'path', p.required);
  }

  for (const q of def.queryParams ?? []) {
    addParam(q.cliFlag ?? q.name, q.type, q.description, 'query', q.required === true);
  }

  for (const b of def.bodyParams ?? []) {
    addParam(b.cliFlag ?? b.name, b.type, b.description, 'body', b.required === true);
  }

  if (Object.keys(properties).length === 0) return undefined;

  const schema: JsonSchemaObject = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}
