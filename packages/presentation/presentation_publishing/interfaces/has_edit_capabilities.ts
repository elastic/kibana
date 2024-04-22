/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HasTypeDisplayName } from './has_type';

/**
 * An interface which determines whether or not a given API is editable.
 * In order to be editable, the api requires an edit function to execute the action
 * a getTypeDisplayName function to display to the user which type of chart is being
 * edited, and an isEditingEnabled function.
 */
export interface HasEditCapabilities extends HasTypeDisplayName {
  onEdit: () => void;
  isEditingEnabled: () => boolean;
  getEditHref?: () => string | undefined;
}

/**
 * A type guard which determines whether or not a given API is editable.
 */
export const hasEditCapabilities = (root: unknown): root is HasEditCapabilities => {
  return Boolean(
    root &&
      (root as HasEditCapabilities).onEdit &&
      typeof (root as HasEditCapabilities).onEdit === 'function' &&
      (root as HasEditCapabilities).getTypeDisplayName &&
      typeof (root as HasEditCapabilities).getTypeDisplayName === 'function' &&
      (root as HasEditCapabilities).isEditingEnabled &&
      typeof (root as HasEditCapabilities).isEditingEnabled === 'function'
  );
};
