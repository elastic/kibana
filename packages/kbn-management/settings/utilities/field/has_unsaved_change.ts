/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import isEqual from 'lodash/isEqual';

import type {
  FieldDefinition,
  SettingType,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';

/**
 * Compares a given {@link FieldDefinition} to an {@link UnsavedFieldChange} to determine
 * if the field has an unsaved change in the UI.
 *
 * @param field The field to compare.
 * @param unsavedChange The unsaved change to compare.
 */
export const hasUnsavedChange = <T extends SettingType>(
  field: Pick<FieldDefinition<T>, 'savedValue' | 'defaultValue'>,
  unsavedChange?: Pick<UnsavedFieldChange<T>, 'unsavedValue'>
) => {
  // If there's no unsaved change, return false.
  if (!unsavedChange) {
    return false;
  }

  const { unsavedValue } = unsavedChange;

  const { savedValue, defaultValue } = field;
  const hasSavedValue = savedValue !== undefined && savedValue !== null;

  // Return a comparison of the unsaved value to:
  //   the saved value, if the field has a saved value, or
  //   the default value, if the field does not have a saved value.
  return !isEqual(unsavedValue, hasSavedValue ? savedValue : defaultValue);
};
