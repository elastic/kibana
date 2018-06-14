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

import { getEmbeddableError, getEmbeddableInitialized } from '../../selectors';
import { store } from '../../store';
import { embeddableIsInitializing, setPanels } from '../actions';

beforeAll(() => {
  const panelData = {
    embeddableConfig: {},
    gridData: {
      h: 0,
      id: '0',
      w: 0,
      x: 0,
      y: 0,
    },
    id: '123',
    panelIndex: 'foo1',
    type: 'mySpecialType',
    version: '123',
  };
  store.dispatch(setPanels({ foo1: panelData }));
});

describe('embeddableIsInitializing', () => {
  test('clears the error', () => {
    store.dispatch(embeddableIsInitializing('foo1'));
    const initialized = getEmbeddableInitialized(store.getState(), 'foo1');
    expect(initialized).toBe(false);
  });

  test('and clears the error', () => {
    const error = getEmbeddableError(store.getState(), 'foo1');
    expect(error).toBe(undefined);
  });
});
