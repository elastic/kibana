/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '../../elasticsearch';
import { next } from './next';
import { State } from './state';

describe('migrations v2 next', () => {
  it.todo('when state.retryDelay > 0 delays execution of the next action');
  it('DONE returns null', () => {
    const state = { controlState: 'DONE' } as State;
    const action = next({} as ElasticsearchClient, (() => {}) as any)(state);
    expect(action).toEqual(null);
  });
  it('FATAL returns null', () => {
    const state = { controlState: 'FATAL', reason: '' } as State;
    const action = next({} as ElasticsearchClient, (() => {}) as any)(state);
    expect(action).toEqual(null);
  });
});
