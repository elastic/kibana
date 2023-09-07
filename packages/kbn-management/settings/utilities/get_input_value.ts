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
 * Convenience function that, given a {@link FieldDefinition} and an {@link UnsavedFieldChange},
 * returns the value to be displayed in the input field, and a boolean indicating whether the
 * value is an unsaved value.
 *
 * @param field The field to compare.
 * @param change The unsaved change to compare.
 */
export function getInputValue(field: F<'array'>, change: C<'array'>): [string[], boolean];
export function getInputValue(field: F<'color'>, change: C<'color'>): [string, boolean];
export function getInputValue(field: F<'boolean'>, change: C<'boolean'>): [boolean, boolean];
export function getInputValue(field: F<'image'>, change: C<'image'>): [string, boolean];
export function getInputValue(field: F<'json'>, change: C<'json'>): [string, boolean];
export function getInputValue(field: F<'markdown'>, change: C<'markdown'>): [string, boolean];
export function getInputValue(field: F<'number'>, change: C<'number'>): [number, boolean];
export function getInputValue(field: F<'select'>, change: C<'select'>): [string, boolean];
export function getInputValue(field: F<'string'>, change: C<'string'>): [string, boolean];
export function getInputValue(
  field: F<'undefined'>,
  change: C<'undefined'>
): [string | null | undefined, boolean];
export function getInputValue<S extends SettingType>(field: F<S>, change: C<S>) {
  const isUnsavedValue = hasUnsavedChange(field, change);

  const value = isUnsavedValue
    ? change.unsavedValue
    : field.savedValue !== undefined && field.savedValue !== null
    ? field.savedValue
    : field.defaultValue;

  return [value, isUnsavedValue];
}
