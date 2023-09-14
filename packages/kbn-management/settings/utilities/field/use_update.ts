/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldDefinition, SettingType, OnChangeFn } from '@kbn/management-settings-types';
import { hasUnsavedChange } from './has_unsaved_change';

export const useUpdate = <T extends SettingType>({
  onChange,
  field,
}: {
  onChange: OnChangeFn<T>;
  field: Pick<FieldDefinition<T>, 'defaultValue' | 'savedValue'>;
}) => {
  const onUpdate: OnChangeFn<T> = (update) => {
    if (hasUnsavedChange(field, update)) {
      onChange(update);
    } else {
      onChange();
    }
  };

  return onUpdate;
};
