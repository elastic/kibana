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
import { esApiRegistry } from './es/registry';
import { kbApiRegistry } from './kb/registry';

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
  /**
   * Stable identifier for the operation, unique within a registry's manifest.
   *
   * Built from `namespace` and `name`: namespaced operations are rendered as
   * `"<namespace>.<name>"` (e.g. `"indices.create"`); root-level operations (with no
   * namespace) use just the name (e.g. `"bulk"`).
   */
  readonly id: string;
  /** Operation name (e.g. `"create"`, `"bulk"`). */
  readonly name: string;
  /** Namespace group (e.g. `"indices"`), or `null` for root-level operations. */
  readonly namespace: string | null;
  /** Short, human-readable description of the operation. */
  readonly description: string;
  /** Stable identifier of the file that holds the full definition. */
  readonly namespaceFile: string;
}

/**
 * Decorates raw manifest entries with a derived {@link ApiRegistryMeta.id}.
 *
 * Used by each target registry to expose an `id` on every manifest entry without
 * requiring the generated `api-manifest.ts` files to carry it.
 */
export const withApiId = <T extends { readonly name: string; readonly namespace: string | null }>(
  entries: readonly T[]
): ReadonlyArray<T & { readonly id: string }> =>
  entries.map((entry) => ({
    ...entry,
    id: entry.namespace != null ? `${entry.namespace}.${entry.name}` : entry.name,
  }));

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
export interface ApiRegistry<M extends ApiRegistryMeta = ApiRegistryMeta> {
  readonly manifest: readonly M[];
  loadApi(meta: M): Promise<LoadedApi>;
}

/** The two backend targets supported by the SDK. */
export type ApiTarget = 'elasticsearch' | 'kibana';

/**
 * A registry keyed by {@link ApiTarget}.
 *
 * Use this instead of the individual `esApiRegistry` / `kbApiRegistry` constants.
 * The target value is the single discriminator for all generic API tooling that
 * needs to discover, document, and execute operations without hard-coding a backend.
 */
export const apiRegistries: Record<ApiTarget, ApiRegistry> = {
  elasticsearch: esApiRegistry,
  kibana: kbApiRegistry,
};
