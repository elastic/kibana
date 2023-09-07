/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SettingType, UnsavedFieldChange, FieldDefinition } from '@kbn/management-settings-types';
import { hasUnsavedChange } from './has_unsaved_change';

type D<T extends SettingType> = FieldDefinition<T>;
type C<T extends SettingType> = UnsavedFieldChange<T>;

export function getInputValue(f: D<'array'>, u: C<'array'>): [string[], boolean];
export function getInputValue(f: D<'color'>, u: C<'color'>): [string, boolean];
export function getInputValue(f: D<'boolean'>, u: C<'boolean'>): [boolean, boolean];
export function getInputValue(f: D<'image'>, u: C<'image'>): [string, boolean];
export function getInputValue(f: D<'json'>, u: C<'json'>): [string, boolean];
export function getInputValue(f: D<'markdown'>, u: C<'markdown'>): [string, boolean];
export function getInputValue(f: D<'number'>, u: C<'number'>): [number, boolean];
export function getInputValue(f: D<'select'>, u: C<'select'>): [string, boolean];
export function getInputValue(f: D<'string'>, u: C<'string'>): [string, boolean];
export function getInputValue(
  f: D<'undefined'>,
  u: C<'undefined'>
): [string | null | undefined, boolean];
export function getInputValue<S extends SettingType>(f: D<S>, u: C<S>) {
  const isUnsavedValue = hasUnsavedChange(f, u);
  const value = isUnsavedValue
    ? u.unsavedValue
    : f.savedValue !== undefined && f.savedValue !== null
    ? f.savedValue
    : f.defaultValue;
  return [value, isUnsavedValue];
}
