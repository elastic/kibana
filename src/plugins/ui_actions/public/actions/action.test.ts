/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
