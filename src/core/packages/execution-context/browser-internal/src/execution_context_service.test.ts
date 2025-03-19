/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-browser';
import { ExecutionContextService } from './execution_context_service';

describe('ExecutionContextService', () => {
  let execContext: ExecutionContextSetup;
  let curApp$: BehaviorSubject<string>;
  let execService: ExecutionContextService;
  let analytics: jest.Mocked<AnalyticsServiceSetup>;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceSetup();
    execService = new ExecutionContextService();
    execContext = execService.setup({ analytics });
    curApp$ = new BehaviorSubject('app1');
    execContext = execService.start({
      curApp$,
    });
  });

  it('should extend the analytics context', async () => {
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    const context$ = analytics.registerContextProvider.mock.calls[0][0].context$;
    execContext.set({
      type: 'ghf',
      meta: {
        foo: 'test',
      },
      description: 'first set',
    });

    await expect(firstValueFrom(context$)).resolves.toMatchInlineSnapshot(`
                  Object {
                    "applicationId": "app1",
                    "entityId": undefined,
                    "page": undefined,
                    "pageName": "ghf:app1",
                  }
              `);
  });

  it('app name updates automatically and clears everything else', () => {
    execContext.set({
      type: 'ghf',
      meta: {
        foo: 1,
      },
      description: 'first set',
    });

    expect(execContext.get()).toMatchInlineSnapshot(
      {
        name: 'app1',
        description: 'first set',
        type: 'ghf',
        url: '/',
      },
      `
      Object {
        "description": "first set",
        "meta": Object {
          "foo": 1,
        },
        "name": "app1",
        "type": "ghf",
        "url": "/",
      }
    `
    );

    curApp$.next('app2');

    expect(execContext.get()).toMatchInlineSnapshot(
      {
        name: 'app2',
        url: '/',
      },
      `
      Object {
        "name": "app2",
        "type": "application",
        "url": "/",
      }
    `
    );
  });

  it('sets context and adds current url and appid when getting it', () => {
    execContext.set({
      type: 'ghf',
      meta: {
        foo: false,
      },
      description: 'first set',
    });

    expect(execContext.get()).toMatchInlineSnapshot(
      {
        name: 'app1',
        description: 'first set',
        type: 'ghf',
        url: '/',
      },
      `
      Object {
        "description": "first set",
        "meta": Object {
          "foo": false,
        },
        "name": "app1",
        "type": "ghf",
        "url": "/",
      }
    `
    );
  });

  it('merges context between calls and gets it', () => {
    execContext.set({
      type: 'ghf',
      meta: {
        foo: true,
      },
      description: 'first set',
    });

    execContext.set({
      type: 'ghf',
      description: 'second set',
    });

    expect(execContext.get()).toMatchInlineSnapshot(
      {
        name: 'app1',
        type: 'ghf',
        description: 'second set',
        url: '/',
      },
      `
      Object {
        "description": "second set",
        "meta": Object {
          "foo": true,
        },
        "name": "app1",
        "type": "ghf",
        "url": "/",
      }
    `
    );
  });

  it('context observable fires the context each time it changes', () => {
    const sub = jest.fn();

    execContext.set({
      type: 'ghf',
      meta: {
        foo: 'meta',
      },
      description: 'first set',
    });

    execContext.context$.subscribe(sub);

    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'ghf',
      description: 'first set',
      meta: {
        foo: 'meta',
      },
      url: '/',
    });

    execContext.set({
      type: 'str',
      description: 'first set',
    });

    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'str',
      meta: {
        foo: 'meta',
      },
      description: 'first set',
      url: '/',
    });

    expect(sub).toHaveBeenCalledTimes(2);
  });

  it('context observable doesnt fires if the context did not change', () => {
    const sub = jest.fn();

    execContext.set({
      type: 'ghf',
      meta: {
        foo: 'test',
      },
      description: 'first set',
    });

    execContext.context$.subscribe(sub);

    execContext.set({
      type: 'ghf',
    });

    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'ghf',
      meta: {
        foo: 'test',
      },
      description: 'first set',
      url: '/',
    });

    expect(sub).toHaveBeenCalledTimes(1);
  });

  it('clear resets context and triggers context observable', () => {
    const sub = jest.fn();

    execContext.set({
      type: 'ghf',
      meta: {
        foo: true,
      },
      description: 'first set',
    });
    execContext.context$.subscribe(sub);

    execContext.clear();
    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'application',
      url: '/',
    });

    // Clear triggers the observable
    expect(sub).toHaveBeenCalledTimes(2);
  });

  it('getAsLabels return relevant values', () => {
    execContext.set({
      type: 'ghf',
      description: 'first set',
      page: 'mypage',
      child: {
        meta: {
          foo: 'test',
        },
        description: 'inner',
      },
      id: '123',
    });

    expect(execContext.getAsLabels()).toMatchInlineSnapshot(
      {
        name: 'app1',
        page: 'mypage',
        id: '123',
      },
      `
      Object {
        "id": "123",
        "name": "app1",
        "page": "mypage",
      }
    `
    );
  });

  it('getAsLabels removes undefined values', () => {
    execContext.set({
      type: 'ghf',
      description: 'first set',
      page: 'mypage',
      meta: {
        foo: false,
      },
      id: undefined,
    });

    expect(execContext.get()).toMatchInlineSnapshot(
      {
        name: 'app1',
        type: 'ghf',
        page: 'mypage',
        url: '/',
        description: 'first set',
        id: undefined,
      },
      `
      Object {
        "description": "first set",
        "id": undefined,
        "meta": Object {
          "foo": false,
        },
        "name": "app1",
        "page": "mypage",
        "type": "ghf",
        "url": "/",
      }
    `
    );

    expect(execContext.getAsLabels()).toMatchInlineSnapshot(
      {
        name: 'app1',
        page: 'mypage',
      },
      `
      Object {
        "name": "app1",
        "page": "mypage",
      }
    `
    );
  });

  it('stop clears subscriptions', () => {
    const sub = jest.fn();
    execContext.context$.subscribe(sub);
    sub.mockReset();

    execService.stop();
    curApp$.next('abc');

    expect(sub).not.toHaveBeenCalled();
  });
});
