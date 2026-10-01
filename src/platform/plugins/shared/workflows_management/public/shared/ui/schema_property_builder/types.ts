/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Types the visual schema builder can author. */
export type SchemaPropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array';

/**
 * How the property behaves when the caller omits a value.
 * A single discriminant — required + default cannot both be set.
 */
export type SchemaPropertyMode = 'required' | 'default' | 'none';

/** One named property in the reusable inputs/outputs schema builder. */
export interface SchemaPropertyField {
  readonly id: string;
  readonly name: string;
  readonly type: SchemaPropertyType;
  readonly description: string;
  /** Required / default / leave-empty — exclusive by construction. */
  readonly mode: SchemaPropertyMode;
  /** String form of the default; only meaningful when mode === 'default'. */
  readonly defaultValue: string;
  /** Allowed values for scalar types (maps to JSON Schema `enum` / `examples`). */
  readonly allowedValues: readonly string[];
  /** When true, allowed values are suggestions (`examples`); when false, a closed `enum`. */
  readonly allowOtherValues: boolean;
  /** Nested object properties (type === 'object'). */
  readonly properties?: readonly SchemaPropertyField[];
  /** Array item type (type === 'array'). */
  readonly itemType?: SchemaPropertyType;
  /** Nested object shape when itemType === 'object'. */
  readonly itemProperties?: readonly SchemaPropertyField[];
}

export type SchemaPropertyNameError = 'empty' | 'invalid' | 'duplicate';

export const SCHEMA_PROPERTY_TYPE_OPTIONS: ReadonlyArray<{
  value: SchemaPropertyType;
  text: string;
}> = [
  { value: 'string', text: 'string' },
  { value: 'number', text: 'number' },
  { value: 'boolean', text: 'boolean' },
  { value: 'date', text: 'date' },
  { value: 'object', text: 'object' },
  { value: 'array', text: 'array' },
];

/** Scalars that support allowed-values lists. */
export const SCALAR_SCHEMA_PROPERTY_TYPES: ReadonlySet<SchemaPropertyType> = new Set([
  'string',
  'number',
  'boolean',
  'date',
]);

/** Max nesting depth for object/array-of-object property builders (root = 0). */
export const SCHEMA_PROPERTY_MAX_DEPTH = 2;
