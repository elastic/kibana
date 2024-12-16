/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingMetadata, Value } from '@kbn/management-settings-types';
import isEqual from 'lodash/isEqual';

/**
 * Utility function to compare a value to the default value of a {@link UiSettingMetadata}.
 * @param setting The source {@link UiSettingMetadata} object.
 * @param userValue The value to compare to the setting's default value.  Default is the
 * {@link UiSettingMetadata}'s user value.
 * @returns True if the provided value is equal to the setting's default value, false otherwise.
 */
export const isSettingDefaultValue = (
  setting: UiSettingMetadata,
  userValue: Value = setting.userValue
) => {
  const { value } = setting;

  if (userValue === undefined || userValue === null) {
    return true;
  }

  return isEqual(value, userValue);
};
