/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
/**
 * Shared schemas can be mutated by OAS post-processing before they are compared
 * against later registrations. Ignore transient generator annotations so collision
 * detection only sees the public schema shape.
 */
export declare const normalizeSchemaForCollision: (
  schema: OpenAPIV3.SchemaObject
) => OpenAPIV3.SchemaObject;
export declare const schemasMatch: (
  previous: OpenAPIV3.SchemaObject,
  next: OpenAPIV3.SchemaObject
) => boolean;
/**
 * Build the human-readable diagnostic for a shared-schema id collision.
 *
 * Two shapes are considered colliding when they share an id but differ
 * in any way (deep-equal mismatch). The diagnostic lists property-key
 * differences first because that is the dominant failure mode driven by
 * `Base.extends({...})` patterns inheriting `meta.id` from the base.
 */
export declare const describeSchemaCollision: (
  id: string,
  previous: OpenAPIV3.SchemaObject,
  next: OpenAPIV3.SchemaObject
) => string;
/**
 * Thrown by the OAS converter when a shared schema id is registered with two
 * different shapes within a single generation pass.
 */
export declare class OasSchemaCollisionError extends Error {
  readonly schemaId: string;
  constructor(message: string, schemaId: string);
}
