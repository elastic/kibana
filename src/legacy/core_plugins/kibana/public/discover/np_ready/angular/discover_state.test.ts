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

import { getState } from './discover_state';
import { createBrowserHistory, History } from 'history';

let history: History;
let state: any;
const getCurrentUrl = () => history.createHref(history.location);

describe('Test discover state', () => {
  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getState({
      defaultAppState: { index: 'test' },
      hashHistory: history,
    });
    state.start();
    await state.replaceUrlState();
  });
  afterEach(() => {
    state.stop();
  });
  test('syncGlobalState', async () => {
    state.syncGlobalState({ time: { from: 'a', to: 'b' } });
    state.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#?_a=(index:test)&_g=(time:(from:a,to:b))"`);
  });
  test('syncAppState', async () => {
    state.syncAppState({ index: 'modified' });
    state.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#?_a=(index:modified)"`);
  });
  test('set appState and globalState', async () => {
    state.syncAppState({ index: 'modified' });
    state.syncGlobalState({ time: { from: 'a', to: 'b' } });
    state.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(index:modified)&_g=(time:(from:a,to:b))"`
    );
  });
  test('URL change is propagated to appState and globalState', async () => {
    history.push('/#?_a=(index:modified)&_g=(time:(from:a,to:b))');
    expect(state.globalStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "time": Object {
          "from": "a",
          "to": "b",
        },
      }
    `);
    expect(state.appStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "index": "modified",
      }
    `);
  });
  test('URL navigation to url without _g and _a', async () => {
    await history.push('/#?_g=(time:(from:a,to:b))');
    await history.push('/');
    expect(state.globalStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "time": Object {
          "from": "a",
          "to": "b",
        },
      }
    `);
    expect(state.appStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "index": "test",
      }
    `);
  });

  test('isAppStateDirty', async () => {
    state.syncAppState({ index: 'modified' });
    expect(state.isAppStateDirty()).toBeTruthy();
    state.resetInitialAppState();
    expect(state.isAppStateDirty()).toBeFalsy();
  });
});
