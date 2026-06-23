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

import { z } from '@kbn/zod/v4';
import { apiManifest, loadEsApi } from './es/apis';
import { kbApiManifest, loadKbApi } from './kb/apis';
import type { KbApiDefinition } from './kb/types';
import type { FoundIn } from './lib/schema-args';
import { extractSchemaArgs } from './lib/schema-args';
import { buildRequestParams as buildEsRequestParams } from './es/request-builder';
import { buildKibanaRequestParams } from './kb/request-builder';

const resolveInput = (
  input: z.ZodObject<z.ZodRawShape> | (() => z.ZodObject<z.ZodRawShape>)
): z.ZodObject<z.ZodRawShape> => (typeof input === 'function' ? input() : input);

/** HTTP methods accepted across both the Elasticsearch and Kibana API surfaces. */
export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

/**
 * Cheap, schema-free metadata for a single API operation.
 *
 * Every entry in {@link ApiRegistry.manifest} is one of these. It is intentionally
 * lightweight so callers can list/search the full API surface without paying the
 * cost of loading per-endpoint Zod schemas. Pass an entry back to
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
 * A fully-resolved API definition, including the unified Zod `input` schema (when the
 * operation accepts parameters).
 *
 * Every field of `input` carries `.meta({ found_in: "path" | "query" | "body" })` routing
 * metadata, used by {@link api_manual} to describe each parameter.
 *
 * Note: the `input` schema keys reflect the display representation. For ES they are the
 * wire/schema keys; for Kibana they are the `cliFlag ?? name` keys. Do not use `input`
 * to build HTTP requests — use {@link LoadedApi.buildRequest} instead.
 */
export interface ApiRegistryDefinition {
  readonly name: string;
  readonly namespace?: string;
  readonly description: string;
  readonly method: ApiHttpMethod;
  readonly path: string;
  /** Unified Zod object schema (or a no-arg factory returning one); absent when the API takes no params. */
  readonly input?: z.ZodObject<z.ZodRawShape> | (() => z.ZodObject<z.ZodRawShape>);
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
    const def = await loadEsApi(meta);
    return {
      definition: def,
      buildRequest: (input): ApiRequest => {
        const schemaArgs = def.input != null ? extractSchemaArgs(resolveInput(def.input)) : [];
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

/** Attaches a description and `found_in` routing hint to a field, marking it optional unless required. */
function annotate(
  base: z.ZodType,
  required: boolean,
  description: string,
  foundIn: FoundIn
): z.ZodType {
  const field = required ? base : base.optional();
  return field.meta({ description, found_in: foundIn });
}

/**
 * Temporarily build a simple zod schema, until the full kibana schemas are available
 */
function buildKbRegistryInput(def: KbApiDefinition): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodType> = {};

  for (const p of def.pathParams ?? []) {
    shape[p.name] = annotate(z.string(), p.required, p.description, 'path');
  }

  for (const q of def.queryParams ?? []) {
    const base = q.type === 'boolean' ? z.boolean() : q.type === 'number' ? z.number() : z.string();
    shape[q.cliFlag ?? q.name] = annotate(base, q.required === true, q.description, 'query');
  }

  for (const b of def.bodyParams ?? []) {
    let base: z.ZodType;
    switch (b.type) {
      case 'boolean':
        base = z.boolean();
        break;
      case 'number':
        base = z.number();
        break;
      case 'array':
        base = z.array(z.unknown());
        break;
      case 'object':
        base = z.record(z.string(), z.unknown());
        break;
      default:
        base = z.string();
        break;
    }
    shape[b.cliFlag ?? b.name] = annotate(base, b.required === true, b.description, 'body');
  }

  return z.looseObject(shape);
}
