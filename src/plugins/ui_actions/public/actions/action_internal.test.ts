/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActionDefinition } from './action';
import { ActionInternal } from './action_internal';

const defaultActionDef: ActionDefinition = {
  id: 'test-action',
  execute: jest.fn(),
};

describe('ActionInternal', () => {
  test('can instantiate from action definition', () => {
    const action = new ActionInternal(defaultActionDef);
    expect(action.id).toBe('test-action');
  });
});
