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

export { attachAction } from './attach_action';
export { executeTriggerActions } from './execute_trigger_actions';

export const CONTEXT_MENU_TRIGGER = 'CONTEXT_MENU_TRIGGER';
export const APPLY_FILTER_TRIGGER = 'FITLER_TRIGGER';

import { createRegistry } from '../create_registry';
import { Trigger } from '../types';

export const triggerRegistry = createRegistry<Trigger>();

triggerRegistry.set(CONTEXT_MENU_TRIGGER, {
  id: CONTEXT_MENU_TRIGGER,
  title: 'Context menu',
  actionIds: [],
});

triggerRegistry.set(APPLY_FILTER_TRIGGER, {
  id: APPLY_FILTER_TRIGGER,
  title: 'Filter click',
  actionIds: [],
});
