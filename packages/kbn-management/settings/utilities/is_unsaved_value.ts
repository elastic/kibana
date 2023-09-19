/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import isEqual from 'lodash/isEqual';

import { FieldDefinition, KnownTypeToValue, SettingType } from '@kbn/management-settings-types';

/**
 * Convenience function to compare a given {@link FieldDefinition} to an {@link UnsavedFieldChange}
 * to determine if the value in the unsaved change is a different value from what is saved.
 *
 * @param field The field to compare.
 * @param unsavedValue The unsaved value to compare.
 */
export const isUnsavedValue = <T extends SettingType>(
  field: FieldDefinition<T>,
  unsavedValue?: KnownTypeToValue<T> | null
) => {
  const { savedValue } = field;

  return unsavedValue !== undefined && !isEqual(unsavedValue, savedValue);
};
