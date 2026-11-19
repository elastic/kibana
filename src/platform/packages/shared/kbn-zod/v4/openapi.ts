/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// OpenAPI-specific metadata that can be attached to a Zod schema via `.meta({ openapi: { ... } })`.
// These concepts cannot be expressed with plain Zod / JSON Schema, so they are
// carried on the schema's global-registry metadata and merged into the OpenAPI
// (OAS) document by `@kbn/router-to-openapispec`.

/**
 * OpenAPI discriminator. Structurally mirrors `OpenAPIV3.DiscriminatorObject`
 * from `openapi-types` (kept local so `@kbn/zod` stays dependency-free).
 */
export interface DiscriminatorObject {
  /** Name of the property in the payload that holds the discriminating value. */
  propertyName: string;
  /**
   * Optional map of discriminating values to the schema (usually a
   * `#/components/schemas/...` reference) that should be used for that value.
   */
  mapping?: { [key: string]: string };
}

/**
 * API lifecycle information. The OAS generator maps this to an `x-state`
 * extension on the corresponding schema (or named component).
 */
export interface OasMetaAvailability {
  /**
   * Lifecycle stage of the API surface. Determines the leading `x-state` text:
   *
   * - `stable` → Generally available
   * - `tech_preview` → Technical Preview
   * - `experimental` → Experimental
   */
  stability?: 'experimental' | 'stable' | 'tech_preview';
  /**
   * Version in which this feature became available (e.g. `'9.4.0'`).
   * Appended to `x-state` output. Omitted in serverless output.
   */
  since?: string;
}

/**
 * Register a Zod schema so that the OAS converter emits it as a named
 * component (`$ref: '#/components/schemas/<name>'`) instead of inlining it.
 *
 * These fields are merged verbatim into the generated OAS component schema,
 * filling the gap where Zod/JSON Schema cannot express OAS-native concepts.
 *
 */
export interface OasMetaExtensions {
  /**
   * OAS discriminator for `z.union` schemas. Emitted verbatim as the
   * `discriminator` keyword on the generated schema.
   *
   * @example
   * ```ts
   * export const StreamDefinition = z.union([...]).meta({
   *   id: 'StreamDefinition',
   *   openapi: {
   *     discriminator: {
   *       propertyName: 'type',
   *       mapping: { wired: '#/components/schemas/WiredStreamDefinition' },
   *     },
   *   },
   * });
   * ```
   */
  discriminator?: DiscriminatorObject;
  /**
   * API lifecycle info. Mapped by the generator to an `x-state` extension on
   * the corresponding schema (or named component).
   *
   * @example
   * z.string().meta({
   *   openapi: { availability: { stability: 'stable', since: '9.4.0' } },
   * });
   */
  availability?: OasMetaAvailability;
  /**
   * Length bounds a reporting-mode (`.warn()`) string helper plans to enforce. Reporting mode
   * enforces no bound, so the generated spec carries no `minLength` / `maxLength`; these are
   * emitted verbatim to give clients advance notice. Keys mirror `X_KIBANA_PLANNED_MIN_LENGTH`
   * and `X_KIBANA_PLANNED_MAX_LENGTH` in `@kbn/schema-string-helpers`.
   */
  'x-kibana-planned-min-length'?: number;
  'x-kibana-planned-max-length'?: number;
}

declare module 'zod/v4/core' {
  interface GlobalMeta {
    /**
     * OpenAPI-specific metadata consumed by `@kbn/router-to-openapispec` when
     * generating the OAS document. Ignored by Zod's runtime validation.
     */
    openapi?: OasMetaExtensions;
  }
}
