/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActionExecutionContext, createAction } from '..';
import { defaultTrigger } from '../triggers';

const sayHelloAction = createAction<{ amICompatible: boolean }>({
  id: 'test',
  type: 'test',
  isCompatible: ({ amICompatible }) => Promise.resolve(amICompatible),
  execute: () => Promise.resolve(),
});

test('action is not compatible based on context', async () => {
  const isCompatible = await sayHelloAction.isCompatible({
    amICompatible: false,
    trigger: defaultTrigger,
  } as ActionExecutionContext<{ amICompatible: boolean }>);
  expect(isCompatible).toBe(false);
});

test('action is compatible based on context', async () => {
  const isCompatible = await sayHelloAction.isCompatible({
    amICompatible: true,
    trigger: defaultTrigger,
  } as ActionExecutionContext<{ amICompatible: boolean }>);
  expect(isCompatible).toBe(true);
});
