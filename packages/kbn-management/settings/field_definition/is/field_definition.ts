/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// This file is enormous and looks a bit excessive, but it's actually a collection
// of type guards.
//
// In the past, the UI would key off of the `type` property of a UISetting to do
// its work.  This was not at all type-safe, and it was easy to make mistakes.
//
// These type guards narrow a given {@link FieldDefinition} to its correct Typescript
// interface.  What's interesting is that these guards compile to checking the `type`
// property of the object-- just as we did before-- but with the benefit of Typescript.

import {
  ArrayFieldDefinition,
  BooleanFieldDefinition,
  ColorFieldDefinition,
  FieldDefinition,
  ImageFieldDefinition,
  JsonFieldDefinition,
  MarkdownFieldDefinition,
  NumberFieldDefinition,
  SelectFieldDefinition,
  StringFieldDefinition,
  UndefinedFieldDefinition,
} from '@kbn/management-settings-types';

/** Simplifed type for a {@link FieldDefinition} */
type Definition = Pick<FieldDefinition, 'type'>;

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link ArrayFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isArrayFieldDefinition = (d: Definition): d is ArrayFieldDefinition =>
  d.type === 'array';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link BooleanFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isBooleanFieldDefinition = (d: Definition): d is BooleanFieldDefinition =>
  d.type === 'boolean';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link ColorFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isColorFieldDefinition = (d: Definition): d is ColorFieldDefinition =>
  d.type === 'color';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link ImageFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isImageFieldDefinition = (d: Definition): d is ImageFieldDefinition =>
  d.type === 'image';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link JsonFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isJsonFieldDefinition = (d: Definition): d is JsonFieldDefinition => d.type === 'json';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link MarkdownFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isMarkdownFieldDefinition = (d: Definition): d is MarkdownFieldDefinition =>
  d.type === 'markdown';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link NumberFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isNumberFieldDefinition = (d: Definition): d is NumberFieldDefinition =>
  d.type === 'number';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link SelectFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isSelectFieldDefinition = (d: Definition): d is SelectFieldDefinition =>
  d.type === 'select';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link StringFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isStringFieldDefinition = (d: Definition): d is StringFieldDefinition =>
  d.type === 'string';

/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link UndefinedFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export const isUndefinedFieldDefinition = (d: Definition): d is UndefinedFieldDefinition =>
  d.type === 'undefined';
