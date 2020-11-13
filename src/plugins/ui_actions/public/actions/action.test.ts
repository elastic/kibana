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

import { ActionExecutionContext, createAction } from '../../../ui_actions/public';
import { ActionType } from '../types';
import { defaultTrigger } from '../triggers';

const sayHelloAction = createAction({
  // Casting to ActionType is a hack - in a real situation use
  // declare module and add this id to ActionContextMapping.
  type: 'test' as ActionType,
  isCompatible: ({ amICompatible }: { amICompatible: boolean }) => Promise.resolve(amICompatible),
  execute: () => Promise.resolve(),
});

test('action is not compatible based on context', async () => {
  const isCompatible = await sayHelloAction.isCompatible({
    amICompatible: false,
    trigger: defaultTrigger,
  } as ActionExecutionContext);
  expect(isCompatible).toBe(false);
});

test('action is compatible based on context', async () => {
  const isCompatible = await sayHelloAction.isCompatible({
    amICompatible: true,
    trigger: defaultTrigger,
  } as ActionExecutionContext);
  expect(isCompatible).toBe(true);
});
