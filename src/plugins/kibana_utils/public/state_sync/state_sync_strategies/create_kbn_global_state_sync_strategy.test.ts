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

import { ISyncStrategy } from './types';
import { createSessionStorageSyncStrategy } from './create_session_storage_sync_strategy';
import { createKbnGlobalStateSyncStrategy } from './create_kbn_global_state_sync_strategy';
import { createKbnUrlSyncStrategy } from './create_kbn_url_sync_strategy';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { History, createBrowserHistory } from 'history';
import { Subject } from 'rxjs';
import { takeUntil, toArray } from 'rxjs/operators';

describe('KbnGlobalStateSyncStrategy', () => {
  let storage: StubBrowserStorage;
  let sessionStorageSyncStrategy: ISyncStrategy;
  let urlSyncStrategy: ISyncStrategy;
  let history: History;
  const getCurrentUrl = () => history.createHref(history.location);
  beforeEach(() => {
    history = createBrowserHistory();
    storage = new StubBrowserStorage();
    sessionStorageSyncStrategy = createSessionStorageSyncStrategy(storage);
    urlSyncStrategy = createKbnUrlSyncStrategy({ useHash: false, history });
  });

  it('initial url should take priority', async () => {
    const url =
      'http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_g=(state:1)';
    history.replace('#/?_g=(state:2)');
    storage.setItem('_g', JSON.stringify({ state: 3 }));

    const kbnGlobalSyncStrategy = createKbnGlobalStateSyncStrategy(
      urlSyncStrategy,
      sessionStorageSyncStrategy,
      url
    );

    expect(
      await kbnGlobalSyncStrategy.fromStorage('_g', { isRestoringInitialState: true })
    ).toEqual({ state: 1 });

    // should be updated by kbnGlobalSyncStrategy.fromStorage
    expect(await urlSyncStrategy.fromStorage('_g')).toEqual({ state: 1 });
  });

  it('session storage should take priority', async () => {
    const url = 'http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?';
    history.replace('#/?_g=(state:2)');
    storage.setItem('_g', JSON.stringify({ state: 3 }));

    const kbnGlobalSyncStrategy = createKbnGlobalStateSyncStrategy(
      urlSyncStrategy,
      sessionStorageSyncStrategy,
      url
    );

    expect(
      await kbnGlobalSyncStrategy.fromStorage('_g', { isRestoringInitialState: true })
    ).toEqual({ state: 3 });

    // should be updated by kbnGlobalSyncStrategy.fromStorage
    expect(await urlSyncStrategy.fromStorage('_g')).toEqual({ state: 3 });
  });

  it('should retrieve from url if not restoring state', async () => {
    const url =
      'http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_g=(state:1)';
    history.replace('#/?_g=(state:2)');
    storage.setItem('_g', JSON.stringify({ state: 3 }));

    const kbnGlobalSyncStrategy = createKbnGlobalStateSyncStrategy(
      urlSyncStrategy,
      sessionStorageSyncStrategy,
      url
    );

    expect(
      await kbnGlobalSyncStrategy.fromStorage('_g', { isRestoringInitialState: false })
    ).toEqual({ state: 2 });
  });

  it('should persist state to url and session storage', async () => {
    const url =
      'http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_g=(state:1)';
    history.replace('#/?_g=(state:2)');
    storage.setItem('_g', JSON.stringify({ state: 3 }));

    const kbnGlobalSyncStrategy = createKbnGlobalStateSyncStrategy(
      urlSyncStrategy,
      sessionStorageSyncStrategy,
      url
    );
    const state = { test: 'test', ok: 1 };
    const key = '_s';
    await kbnGlobalSyncStrategy.toStorage(key, state);
    expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#/?_g=(state:2)&_s=(ok:1,test:test)"`);
    expect(JSON.parse(storage.getItem('_s')!)).toEqual(state);
    expect(await kbnGlobalSyncStrategy.fromStorage(key)).toEqual(state);
  });

  it('should notify about url changes', async () => {
    const url =
      'http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_g=(state:1)';
    history.replace('#/?_g=(state:2)');
    storage.setItem('_g', JSON.stringify({ state: 3 }));

    const kbnGlobalSyncStrategy = createKbnGlobalStateSyncStrategy(
      urlSyncStrategy,
      sessionStorageSyncStrategy,
      url
    );
    expect(kbnGlobalSyncStrategy.storageChange$).toBeDefined();
    const key = '_s';
    const destroy$ = new Subject();
    const result = kbnGlobalSyncStrategy.storageChange$!(key)
      .pipe(takeUntil(destroy$), toArray())
      .toPromise();

    history.push(`/#?${key}=(ok:1,test:test)`);
    history.push(`/?query=test#?${key}=(ok:2,test:test)&some=test`);
    history.push(`/?query=test#?some=test`);

    destroy$.next();
    destroy$.complete();

    expect(await result).toEqual([{ test: 'test', ok: 1 }, { test: 'test', ok: 2 }, null]);
  });
});
