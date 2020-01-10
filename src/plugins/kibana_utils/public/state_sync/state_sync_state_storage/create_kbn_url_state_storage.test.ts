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
import '../../storage/hashed_item_store/mock';
import { createKbnUrlStateStorage, IKbnUrlStateStorage } from './create_kbn_url_state_storage';
import { History, createBrowserHistory } from 'history';
import { takeUntil, toArray } from 'rxjs/operators';
import { Subject } from 'rxjs';

describe('KbnUrlStateStorage', () => {
  describe('useHash: false', () => {
    let urlStateStorage: IKbnUrlStateStorage;
    let history: History;
    const getCurrentUrl = () => history.createHref(history.location);
    beforeEach(() => {
      history = createBrowserHistory();
      history.push('/');
      urlStateStorage = createKbnUrlStateStorage({ useHash: false, history });
    });

    it('should persist state to url', async () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      await urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);
    });

    it('should flush state to url', () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);
      urlStateStorage.flush();
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);
    });

    it('should cancel url updates', async () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      const pr = urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);
      urlStateStorage.cancel();
      await pr;
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);
      expect(urlStateStorage.get(key)).toEqual(null);
    });

    it('should notify about url changes', async () => {
      expect(urlStateStorage.change$).toBeDefined();
      const key = '_s';
      const destroy$ = new Subject();
      const result = urlStateStorage.change$!(key)
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

  describe('useHash: true', () => {
    let urlStateStorage: IKbnUrlStateStorage;
    let history: History;
    const getCurrentUrl = () => history.createHref(history.location);
    beforeEach(() => {
      history = createBrowserHistory();
      history.push('/');
      urlStateStorage = createKbnUrlStateStorage({ useHash: true, history });
    });

    it('should persist state to url', async () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      await urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#?_s=h@487e077"`);
      expect(urlStateStorage.get(key)).toEqual(state);
    });

    it('should notify about url changes', async () => {
      expect(urlStateStorage.change$).toBeDefined();
      const key = '_s';
      const destroy$ = new Subject();
      const result = urlStateStorage.change$!(key)
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
});
