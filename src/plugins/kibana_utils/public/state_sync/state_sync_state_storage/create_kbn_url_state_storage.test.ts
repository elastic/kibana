/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockStorage } from '../../storage/hashed_item_store/mock';
import { createKbnUrlStateStorage, IKbnUrlStateStorage } from './create_kbn_url_state_storage';
import { History, createBrowserHistory } from 'history';
import { takeUntil, toArray } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ScopedHistory } from '@kbn/core/public';
import { withNotifyOnErrors } from '../../state_management/url';
import { coreMock } from '@kbn/core/public/mocks';

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
      expect(!!urlStateStorage.kbnUrlControls.flush()).toBe(true);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/#?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);

      expect(!!urlStateStorage.kbnUrlControls.flush()).toBe(false); // nothing to flush, not update
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

    it('should cancel url updates if synchronously returned to the same state', async () => {
      const state1 = { test: 'test', ok: 1 };
      const state2 = { test: 'test', ok: 2 };
      const key = '_s';
      const pr1 = urlStateStorage.set(key, state1);
      await pr1;
      const historyLength = history.length;
      const pr2 = urlStateStorage.set(key, state2);
      const pr3 = urlStateStorage.set(key, state1);
      await Promise.all([pr2, pr3]);
      expect(history.length).toBe(historyLength);
    });

    it('should notify about url changes', async () => {
      expect(urlStateStorage.change$).toBeDefined();
      const key = '_s';
      const destroy$ = new Subject<void>();
      const result = urlStateStorage.change$!(key).pipe(takeUntil(destroy$), toArray()).toPromise();

      history.push(`/#?${key}=(ok:1,test:test)`);
      history.push(`/?query=test#?${key}=(ok:2,test:test)&some=test`);
      history.push(`/?query=test#?some=test`);

      destroy$.next();
      destroy$.complete();

      expect(await result).toEqual([{ test: 'test', ok: 1 }, { test: 'test', ok: 2 }, null]);
    });

    it("shouldn't throw in case of parsing error", async () => {
      const key = '_s';
      history.replace(`/#?${key}=(ok:2,test:`); // malformed rison
      expect(() => urlStateStorage.get(key)).not.toThrow();
      expect(urlStateStorage.get(key)).toBeNull();
    });

    it('should notify about errors', () => {
      const cb = jest.fn();
      urlStateStorage = createKbnUrlStateStorage({ useHash: false, history, onGetError: cb });
      const key = '_s';
      history.replace(`/#?${key}=(ok:2,test:`); // malformed rison
      expect(() => urlStateStorage.get(key)).not.toThrow();
      expect(cb).toBeCalledWith(expect.any(Error));
    });

    describe('withNotifyOnErrors integration', () => {
      test('toast is shown', () => {
        const toasts = coreMock.createStart().notifications.toasts;
        urlStateStorage = createKbnUrlStateStorage({
          useHash: true,
          history,
          ...withNotifyOnErrors(toasts),
        });
        const key = '_s';
        history.replace(`/#?${key}=(ok:2,test:`); // malformed rison
        expect(() => urlStateStorage.get(key)).not.toThrow();
        expect(toasts.addError).toBeCalled();
      });
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
      const destroy$ = new Subject<void>();
      const result = urlStateStorage.change$!(key).pipe(takeUntil(destroy$), toArray()).toPromise();

      history.push(`/#?${key}=(ok:1,test:test)`);
      history.push(`/?query=test#?${key}=(ok:2,test:test)&some=test`);
      history.push(`/?query=test#?some=test`);

      destroy$.next();
      destroy$.complete();

      expect(await result).toEqual([{ test: 'test', ok: 1 }, { test: 'test', ok: 2 }, null]);
    });

    describe('hashStorage overflow exception', () => {
      let oldLimit: number;
      beforeAll(() => {
        oldLimit = mockStorage.getStubbedSizeLimit();
        mockStorage.clear();
        mockStorage.setStubbedSizeLimit(0);
      });
      afterAll(() => {
        mockStorage.setStubbedSizeLimit(oldLimit);
      });

      it("shouldn't throw in case of error", async () => {
        expect(() => urlStateStorage.set('_s', { test: 'test' })).not.toThrow();
        await expect(urlStateStorage.set('_s', { test: 'test' })).resolves; // not rejects
        expect(getCurrentUrl()).toBe('/'); // url wasn't updated with hash
      });

      it('should notify about errors', async () => {
        const cb = jest.fn();
        urlStateStorage = createKbnUrlStateStorage({ useHash: true, history, onSetError: cb });
        await expect(urlStateStorage.set('_s', { test: 'test' })).resolves; // not rejects
        expect(cb).toBeCalledWith(expect.any(Error));
      });

      describe('withNotifyOnErrors integration', () => {
        test('toast is shown', async () => {
          const toasts = coreMock.createStart().notifications.toasts;
          urlStateStorage = createKbnUrlStateStorage({
            useHash: true,
            history,
            ...withNotifyOnErrors(toasts),
          });
          await expect(urlStateStorage.set('_s', { test: 'test' })).resolves; // not rejects
          expect(toasts.addError).toBeCalled();
        });
      });
    });
  });

  describe('useHashQuery: false', () => {
    let urlStateStorage: IKbnUrlStateStorage;
    let history: History;
    const getCurrentUrl = () => history.createHref(history.location);
    beforeEach(() => {
      history = createBrowserHistory();
      history.push('/');
      urlStateStorage = createKbnUrlStateStorage({ useHash: false, history, useHashQuery: false });
    });

    it('should persist state to url', async () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      await urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);
    });

    it('should flush state to url', () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);
      expect(!!urlStateStorage.kbnUrlControls.flush()).toBe(true);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);

      expect(!!urlStateStorage.kbnUrlControls.flush()).toBe(false); // nothing to flush, not update
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

    it('should cancel url updates if synchronously returned to the same state', async () => {
      const state1 = { test: 'test', ok: 1 };
      const state2 = { test: 'test', ok: 2 };
      const key = '_s';
      const pr1 = urlStateStorage.set(key, state1);
      await pr1;
      const historyLength = history.length;
      const pr2 = urlStateStorage.set(key, state2);
      const pr3 = urlStateStorage.set(key, state1);
      await Promise.all([pr2, pr3]);
      expect(history.length).toBe(historyLength);
    });

    it('should notify about url changes', async () => {
      expect(urlStateStorage.change$).toBeDefined();
      const key = '_s';
      const destroy$ = new Subject<void>();
      const result = urlStateStorage.change$!(key).pipe(takeUntil(destroy$), toArray()).toPromise();

      history.push(`/?${key}=(ok:1,test:test)`);
      history.push(`/?query=test&${key}=(ok:2,test:test)&some=test`);
      history.push(`/?query=test&some=test`);

      destroy$.next();
      destroy$.complete();

      expect(await result).toEqual([{ test: 'test', ok: 1 }, { test: 'test', ok: 2 }, null]);
    });

    it("shouldn't throw in case of parsing error", async () => {
      const key = '_s';
      history.replace(`/?${key}=(ok:2,test:`); // malformed rison
      expect(() => urlStateStorage.get(key)).not.toThrow();
      expect(urlStateStorage.get(key)).toBeNull();
    });

    it('should notify about errors', () => {
      const cb = jest.fn();
      urlStateStorage = createKbnUrlStateStorage({
        useHash: false,
        useHashQuery: false,
        history,
        onGetError: cb,
      });
      const key = '_s';
      history.replace(`/?${key}=(ok:2,test:`); // malformed rison
      expect(() => urlStateStorage.get(key)).not.toThrow();
      expect(cb).toBeCalledWith(expect.any(Error));
    });

    describe('withNotifyOnErrors integration', () => {
      test('toast is shown', () => {
        const toasts = coreMock.createStart().notifications.toasts;
        urlStateStorage = createKbnUrlStateStorage({
          useHash: true,
          useHashQuery: false,
          history,
          ...withNotifyOnErrors(toasts),
        });
        const key = '_s';
        history.replace(`/?${key}=(ok:2,test:`); // malformed rison
        expect(() => urlStateStorage.get(key)).not.toThrow();
        expect(toasts.addError).toBeCalled();
      });
    });
  });

  describe('ScopedHistory integration', () => {
    let urlStateStorage: IKbnUrlStateStorage;
    let history: ScopedHistory;
    const getCurrentUrl = () => history.createHref(history.location);
    beforeEach(() => {
      const parentHistory = createBrowserHistory();
      parentHistory.push('/kibana/app/');
      history = new ScopedHistory(parentHistory, '/kibana/app/');
      urlStateStorage = createKbnUrlStateStorage({ useHash: false, history });
    });

    it('should persist state to url', async () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      await urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/kibana/app/#?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);
    });

    it('should flush state to url', () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/kibana/app/"`);
      expect(!!urlStateStorage.kbnUrlControls.flush()).toBe(true);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/kibana/app/#?_s=(ok:1,test:test)"`);
      expect(urlStateStorage.get(key)).toEqual(state);

      expect(!!urlStateStorage.kbnUrlControls.flush()).toBe(false); // nothing to flush, not update
    });

    it('should cancel url updates', async () => {
      const state = { test: 'test', ok: 1 };
      const key = '_s';
      const pr = urlStateStorage.set(key, state);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/kibana/app/"`);
      urlStateStorage.kbnUrlControls.cancel();
      await pr;
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/kibana/app/"`);
      expect(urlStateStorage.get(key)).toEqual(null);
    });

    it('should cancel url updates if synchronously returned to the same state', async () => {
      const state1 = { test: 'test', ok: 1 };
      const state2 = { test: 'test', ok: 2 };
      const key = '_s';
      const pr1 = urlStateStorage.set(key, state1);
      await pr1;
      const historyLength = history.length;
      const pr2 = urlStateStorage.set(key, state2);
      const pr3 = urlStateStorage.set(key, state1);
      await Promise.all([pr2, pr3]);
      expect(history.length).toBe(historyLength);
    });

    it('should notify about url changes', async () => {
      expect(urlStateStorage.change$).toBeDefined();
      const key = '_s';
      const destroy$ = new Subject<void>();
      const result = urlStateStorage.change$!(key).pipe(takeUntil(destroy$), toArray()).toPromise();

      history.push(`/#?${key}=(ok:1,test:test)`);
      history.push(`/?query=test#?${key}=(ok:2,test:test)&some=test`);
      history.push(`/?query=test#?some=test`);

      destroy$.next();
      destroy$.complete();

      expect(await result).toEqual([{ test: 'test', ok: 1 }, { test: 'test', ok: 2 }, null]);
    });
  });
});
