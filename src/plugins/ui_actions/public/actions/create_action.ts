/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ActionDefinition, Action } from './action';

export function createAction<Context extends object = object>(
  action: ActionDefinition<Context>
): Action<Context> {
  return {
    getIconType: () => undefined,
    order: 0,
    isCompatible: () => Promise.resolve(true),
    getDisplayName: () => '',
    ...action,
  } as Action<Context>;
}
