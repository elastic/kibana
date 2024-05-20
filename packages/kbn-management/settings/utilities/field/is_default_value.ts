/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import isEqual from 'lodash/isEqual';

import { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { hasUnsavedChange } from './has_unsaved_change';

type F<T extends SettingType> = Pick<FieldDefinition<T>, 'savedValue' | 'defaultValue'>;
type C<T extends SettingType> = UnsavedFieldChange<T>;

/**
 * Utility function to determine if a given value is equal to the default value of
 * a {@link FieldDefinition}.
 *
 * @param field The field to compare.
 * @param change The unsaved change to compare.
 */
export function isFieldDefaultValue<S extends SettingType>(field: F<S>, change?: C<S>): boolean {
  const { defaultValue } = field;
  const isUnsavedChange = hasUnsavedChange(field, change);

  const value = isUnsavedChange
    ? change?.unsavedValue
    : field.savedValue !== undefined && field.savedValue !== null
    ? field.savedValue
    : field.defaultValue;

  return isEqual(value, defaultValue);
}
