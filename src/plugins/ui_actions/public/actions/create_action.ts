/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActionContextMapping } from '../types';
import { ActionByType } from './action';
import { ActionType } from '../types';
import { ActionDefinition } from './action';

interface ActionDefinitionByType<T extends ActionType>
  extends Omit<ActionDefinition<ActionContextMapping[T]>, 'id'> {
  id?: string;
}

export function createAction<T extends ActionType>(
  action: ActionDefinitionByType<T>
): ActionByType<T> {
  return {
    getIconType: () => undefined,
    order: 0,
    id: action.type,
    isCompatible: () => Promise.resolve(true),
    getDisplayName: () => '',
    ...action,
  } as ActionByType<T>;
}
