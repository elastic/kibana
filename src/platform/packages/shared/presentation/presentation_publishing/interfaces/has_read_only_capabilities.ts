/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HasTypeDisplayName } from './has_type';

/**
 * An interface which determines whether or not a given API offers to show the config for read only permissions.
 * In order to be read only, the api requires a show config function to execute the action
 * a getTypeDisplayName function to display to the user which type of chart is being
 * shown, and an isReadOnlyEnabled function.
 */
export interface HasReadOnlyCapabilities extends HasTypeDisplayName {
  onShowConfig: () => Promise<void>;
  isReadOnlyEnabled: () => { read: boolean; write: boolean };
}

/**
 * A type guard which determines whether or not a given API is editable.
 */
export const hasReadOnlyCapabilities = (root: unknown): root is HasReadOnlyCapabilities => {
  return Boolean(
    root &&
      typeof (root as HasReadOnlyCapabilities).onShowConfig === 'function' &&
      typeof (root as HasReadOnlyCapabilities).getTypeDisplayName === 'function' &&
      typeof (root as HasReadOnlyCapabilities).isReadOnlyEnabled === 'function'
  );
};
