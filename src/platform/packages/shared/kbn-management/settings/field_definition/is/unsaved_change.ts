/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file is enormous and looks a bit excessive, but it's actually a collection
// of type guards.
//
// In the past, the UI would key off of the `type` property of a UISetting to do
// its work.  This was not at all type-safe, and it was easy to make mistakes.
//
// These type guards narrow a given {@link UnsavedFieldChange} to its correct Typescript
// interface.  What's interesting is that these guards compile to checking the `type`
// property of the object-- just as we did before-- but with the benefit of Typescript.

import {
  ArrayUnsavedFieldChange,
  BooleanUnsavedFieldChange,
  ColorUnsavedFieldChange,
  ImageUnsavedFieldChange,
  JsonUnsavedFieldChange,
  MarkdownUnsavedFieldChange,
  NumberUnsavedFieldChange,
  SelectUnsavedFieldChange,
  StringUnsavedFieldChange,
  UndefinedUnsavedFieldChange,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';

/** Simplifed type for a {@link UnsavedFieldChange} */
type Change = UnsavedFieldChange;

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link ArrayUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isArrayFieldUnsavedChange = (c?: Change): c is ArrayUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'array';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link BooleanUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isBooleanFieldUnsavedChange = (c?: Change): c is BooleanUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'boolean';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link ColorUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isColorFieldUnsavedChange = (c?: Change): c is ColorUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'color';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link ImageUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isImageFieldUnsavedChange = (c?: Change): c is ImageUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'image';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link JsonUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isJsonFieldUnsavedChange = (c?: Change): c is JsonUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'json';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link MarkdownUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isMarkdownFieldUnsavedChange = (c?: Change): c is MarkdownUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'markdown';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link NumberUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isNumberFieldUnsavedChange = (c?: Change): c is NumberUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'number';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link SelectUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isSelectFieldUnsavedChange = (c?: Change): c is SelectUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'select';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link StringUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isStringFieldUnsavedChange = (c?: Change): c is StringUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'string';

/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link UndefinedUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export const isUndefinedFieldUnsavedChange = (c?: Change): c is UndefinedUnsavedFieldChange =>
  !c || c.type === undefined || c.type === 'undefined';
