/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
