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

import { createAction, ActionType } from '../../ui_actions';
import { ViewMode } from '../../types';
import { IEmbeddable } from '../..';

// Casting to ActionType is a hack - in a real situation use
// declare module and add this id to ActionContextMapping.
export const EDIT_MODE_ACTION = 'EDIT_MODE_ACTION' as ActionType;

export function createEditModeAction() {
  return createAction<typeof EDIT_MODE_ACTION>({
    type: EDIT_MODE_ACTION,
    getDisplayName: () => 'I only show up in edit mode',
    isCompatible: async (context: { embeddable: IEmbeddable }) =>
      context.embeddable.getInput().viewMode === ViewMode.EDIT,
    execute: async () => {},
  });
}
