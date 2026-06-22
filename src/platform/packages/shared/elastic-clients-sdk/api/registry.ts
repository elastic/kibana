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
import { apiManifest, loadEsApi } from '../es/apis';
import type { EsApiMeta } from '../es/apis';
import { kbApiManifest, loadKbApi } from '../kb/apis';
import type { KbApiMeta } from '../kb/apis';
import type { KbApiDefinition } from '../kb/types';
import type { FoundIn } from '../lib/schema-args';

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
 * metadata, which {@link extractSchemaArgs} and {@link buildRequestParams} use to assemble
 * the outgoing HTTP request.
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
 * A target-agnostic view over a generated client's API surface.
 *
 * - `manifest` lists every operation as cheap metadata (no schemas loaded).
 * - `loadApi(meta)` dynamic-imports and returns the full definition for one operation.
 *
 * This is the contract consumed by generic API tooling that needs to discover,
 * document, and execute operations without hard-coding a specific target.
 */
export interface ApiRegistry {
  readonly manifest: readonly ApiRegistryMeta[];
  loadApi: (meta: ApiRegistryMeta) => Promise<ApiRegistryDefinition>;
}

/** Registry over the Elasticsearch HTTP API surface. */
export const esApiRegistry: ApiRegistry = {
  manifest: apiManifest,
  loadApi: (meta) => loadEsApi(meta as EsApiMeta),
};

/** Registry over the Kibana HTTP API surface. */
export const kbApiRegistry: ApiRegistry = {
  manifest: kbApiManifest,
  loadApi: async (meta) => toRegistryDefinition(await loadKbApi(meta as KbApiMeta)),
};

/**
 * Normalizes a {@link KbApiDefinition} (which models its params as plain `pathParams` /
 * `queryParams` / `bodyParams` arrays) into the unified {@link ApiRegistryDefinition} shape
 * by building a single Zod `input` schema whose fields carry `found_in` routing metadata.
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
 * Builds the unified `input` schema for a Kibana API definition, routing each declared
 * parameter to its destination (`path` / `query` / `body`) via `found_in` metadata.
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
