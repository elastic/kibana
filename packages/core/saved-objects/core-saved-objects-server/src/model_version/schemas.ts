/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType } from '@kbn/config-schema';
import type { SavedObjectsValidationSpec } from '../validation';

/**
 * The validation and conversion schemas associated with this model version.
 *
 * @public
 */
export interface SavedObjectsModelVersionSchemaDefinitions {
  /**
   * The schema applied when retrieving documents of a higher version from the cluster.
   * Used for multi-version compatibility in managed environments.
   *
   * When retrieving a savedObject document from an index, if the version of the document
   * is higher than the latest version known of the Kibana instance, the document will go
   * through the `forwardCompatibility` schema of the associated model version.
   *
   * E.g a Kibana instance with model version `2` for type `foo` types fetches a `foo` document
   * at model version `3`. The document will then go through the `forwardCompatibility`
   * of the model version 2 (if present).
   *
   * See {@link SavedObjectModelVersionForwardCompatibilitySchema} for more info.
   */
  forwardCompatibility?: SavedObjectModelVersionForwardCompatibilitySchema;
  /**
   * The schema applied when creating a document of the current version
   * Allows for validating properties using @kbn/config-schema validations
   */
  create?: SavedObjectsValidationSpec;
}

/**
 * Schema used when retrieving a document of a higher version to convert them to the older version.
 *
 * These schemas can be defined in multiple ways:
 * - A `@kbn/config-schema`'s Object schema, that will receive the document's attributes
 * - An arbitrary function that will receive the document's attributes as parameter and should return the converted attributes
 *
 * @remark These conversion mechanism shouldn't assert the data itself, and only strip unknown fields to convert
 * the document to the *shape* of the document at the given version.
 *
 * @example using a function:
 * ```ts
 * const versionSchema: SavedObjectModelVersionEvictionFn = (attributes) => {
 *   const knownFields = ['someField', 'anotherField'];
 *   return pick(attributes, knownFields);
 * }
 * ```
 *
 * @example using config-schema:
 * ```ts
 * const versionSchema = schema.object(
 *   {
 *     someField: schema.maybe(schema.string()),
 *     anotherField: schema.maybe(schema.string()),
 *   },
 *   { unknowns: 'ignore' }
 * );
 * ```
 *
 * @public
 */
export type SavedObjectModelVersionForwardCompatibilitySchema<
  InAttrs = unknown,
  OutAttrs = unknown
> =
  | SavedObjectModelVersionForwardCompatibilityObjectSchema
  | SavedObjectModelVersionForwardCompatibilityFn<InAttrs, OutAttrs>;

/**
 * Object-schema (from `@kbn/config-schema`) alternative for {@link SavedObjectModelVersionForwardCompatibilitySchema}
 *
 * @example
 * ```ts
 * const versionSchema = schema.object(
 *   {
 *     someField: schema.maybe(schema.string()),
 *     anotherField: schema.maybe(schema.string()),
 *   },
 *   { unknowns: 'ignore' }
 * );
 * ```
 * @public
 */
export type SavedObjectModelVersionForwardCompatibilityObjectSchema = ObjectType;

/**
 * Plain javascript function alternative for {@link SavedObjectModelVersionForwardCompatibilitySchema}
 *
 * @example
 * ```ts
 * const versionSchema: SavedObjectModelVersionForwardCompatibilityFn = (attributes) => {
 *   const knownFields = ['someField', 'anotherField'];
 *   return pick(attributes, knownFields);
 * }
 * ```
 * @public
 */
export type SavedObjectModelVersionForwardCompatibilityFn<InAttrs = unknown, OutAttrs = unknown> = (
  attributes: InAttrs
) => OutAttrs;
