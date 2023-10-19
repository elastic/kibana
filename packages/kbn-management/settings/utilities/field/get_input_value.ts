/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SettingType, UnsavedFieldChange, FieldDefinition } from '@kbn/management-settings-types';
import { hasUnsavedChange } from './has_unsaved_change';

type F<T extends SettingType> = Pick<FieldDefinition<T>, 'savedValue' | 'defaultValue'>;
type C<T extends SettingType> = UnsavedFieldChange<T>;

/**
 * Convenience function to compare an `array` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `array` {@link FieldDefinition} to compare.
 * @param change The `array` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'array'>, change?: C<'array'>): [string[], boolean];
/**
 * Convenience function to compare an `color` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `color` {@link FieldDefinition} to compare.
 * @param change The `color` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'color'>, change?: C<'color'>): [string, boolean];
/**
 * Convenience function to compare an `boolean` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `boolean` {@link FieldDefinition} to compare.
 * @param change The `boolean` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'boolean'>, change?: C<'boolean'>): [boolean, boolean];
/**
 * Convenience function to compare an `image` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `image` {@link FieldDefinition} to compare.
 * @param change The `image` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'image'>, change?: C<'image'>): [string, boolean];
/**
 * Convenience function to compare an `json` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `json` {@link FieldDefinition} to compare.
 * @param change The `json` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'json'>, change?: C<'json'>): [string, boolean];
/**
 * Convenience function to compare an `markdown` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `markdown` {@link FieldDefinition} to compare.
 * @param change The `markdown` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'markdown'>, change?: C<'markdown'>): [string, boolean];
/**
 * Convenience function to compare an `number` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `number` {@link FieldDefinition} to compare.
 * @param change The `number` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'number'>, change?: C<'number'>): [number, boolean];
/**
 * Convenience function to compare an `select` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `select` {@link FieldDefinition} to compare.
 * @param change The `select` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'select'>, change?: C<'select'>): [string, boolean];
/**
 * Convenience function to compare an `string` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `string` {@link FieldDefinition} to compare.
 * @param change The `string` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(field: F<'string'>, change?: C<'string'>): [string, boolean];
/**
 * Convenience function to compare an `undefined` {@link FieldDefinition} and its {@link UnsavedFieldChange},
 *
 * @param field The `undefined` {@link FieldDefinition} to compare.
 * @param change The `undefined` {@link UnsavedFieldChange } to compare.
 */
export function getFieldInputValue(
  field: F<'undefined'>,
  change?: C<'undefined'>
): [string | null | undefined, boolean];
/**
 * Convenience function that, given a {@link FieldDefinition} and an {@link UnsavedFieldChange},
 * returns the value to be displayed in the input field, and a boolean indicating whether the
 * value is an unsaved value.
 *
 * @param field The {@link FieldDefinition} to compare.
 * @param change The {@link UnsavedFieldChange} to compare.
 */
export function getFieldInputValue<S extends SettingType>(field: F<S>, change?: C<S>) {
  const isUnsavedChange = hasUnsavedChange(field, change);

  const value = isUnsavedChange
    ? change?.unsavedValue
    : field.savedValue !== undefined && field.savedValue !== null
    ? field.savedValue
    : field.defaultValue;

  return [value, isUnsavedChange];
}
