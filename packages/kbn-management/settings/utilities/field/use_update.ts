/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldDefinition, SettingType, OnInputChangeFn } from '@kbn/management-settings-types';
import { hasUnsavedChange } from './has_unsaved_change';

export interface UseUpdateParameters<T extends SettingType> {
  /** The {@link OnInputChangeFn} to invoke. */
  onInputChange: OnInputChangeFn<T>;
  /** The {@link FieldDefinition} to use to create an update. */
  field: Pick<FieldDefinition<T>, 'defaultValue' | 'savedValue'>;
}

/**
 * Hook to provide a standard {@link OnInputChangeFn} that will send an update to the
 * field.
 *
 * @param params The {@link UseUpdateParameters} to use.
 * @returns An {@link OnInputChangeFn} that will send an update to the field.
 */
export const useUpdate = <T extends SettingType>(
  params: UseUpdateParameters<T>
): OnInputChangeFn<T> => {
  const { onInputChange, field } = params;

  return (update) => {
    if (hasUnsavedChange(field, update)) {
      onInputChange(update);
    } else {
      onInputChange();
    }
  };
};
