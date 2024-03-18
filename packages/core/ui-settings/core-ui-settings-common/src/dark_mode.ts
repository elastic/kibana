/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The list of possible values for the dark mode UI setting.
 * - false: dark mode is disabled
 * - true: dark mode is enabled
 * - "system": dark mode will follow the user system preference.
 */
export type DarkModeValue = true | false | 'system';

export const parseDarkModeValue = (rawValue: unknown): DarkModeValue => {
  if (rawValue === true || rawValue === 'true' || rawValue === 'enabled') {
    return true;
  }
  if (rawValue === false || rawValue === 'false' || rawValue === 'disabled') {
    return false;
  }
  if (rawValue === 'system') {
    return 'system';
  }
  return Boolean(rawValue);
};
