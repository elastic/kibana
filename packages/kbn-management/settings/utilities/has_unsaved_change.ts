/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  field: Pick<FieldDefinition<T>, 'savedValue'>,
  unsavedChange?: Pick<UnsavedFieldChange<T>, 'unsavedValue'>
) => {
  if (!unsavedChange) {
    return false;
  }

  const { unsavedValue } = unsavedChange;
  const { savedValue } = field;
  return unsavedValue !== undefined && !isEqual(unsavedValue, savedValue);
};
