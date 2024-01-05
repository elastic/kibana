/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DynamicActionManager } from 'dynamic_actions/dynamic_action_manager';

export interface HasDynamicActions {
  enhancements: {
    dynamicActions: DynamicActionManager;
  }
}

/**
 * HasDynamicActions type guard.
 */
export const hasDynamicActions = (root: unknown): root is HasDynamicActions => {
  return Boolean(
    root &&
      (root as HasDynamicActions).enhancements?.dynamicActions &&
      typeof (root as HasDynamicActions).enhancements.dynamicActions === 'object'
  );
};