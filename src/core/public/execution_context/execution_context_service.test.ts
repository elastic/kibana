/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject } from 'rxjs';
import { ExecutionContextService, ExecutionContextSetup } from './execution_context_service';

describe('ExecutionContextService', () => {
  let execContext: ExecutionContextSetup;
  let curApp$: BehaviorSubject<string>;
  let execService: ExecutionContextService;

  beforeEach(() => {
    execService = new ExecutionContextService();
    execContext = execService.setup();
    curApp$ = new BehaviorSubject('app1');
    execContext = execService.start({
      curApp$,
    });
  });

  it('app name updates automatically and clears everything else', () => {
    execContext.set({
      type: 'ghf',
      description: 'first set',
    });

    expect(execContext.get()).toStrictEqual({
      name: 'app1',
      description: 'first set',
      type: 'ghf',
      url: '/',
    });

    curApp$.next('app2');

    expect(execContext.get()).toStrictEqual({
      name: 'app2',
      url: '/',
    });
  });

  it('sets context and adds current url and appid when getting it', () => {
    execContext.set({
      type: 'ghf',
      description: 'first set',
    });

    expect(execContext.get()).toStrictEqual({
      name: 'app1',
      description: 'first set',
      type: 'ghf',
      url: '/',
    });
  });

  it('merges context between calls and gets it', () => {
    execContext.set({
      type: 'ghf',
      description: 'first set',
    });

    execContext.set({
      type: 'ghf',
      description: 'second set',
    });

    expect(execContext.get()).toStrictEqual({
      name: 'app1',
      type: 'ghf',
      description: 'second set',
      url: '/',
    });
  });

  it('context observable fires the context each time it changes', () => {
    const sub = jest.fn();

    execContext.set({
      type: 'ghf',
      description: 'first set',
    });

    execContext.context$.subscribe(sub);

    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'ghf',
      description: 'first set',
      url: '/',
    });

    execContext.set({
      type: 'str',
      description: 'first set',
    });

    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'str',
      description: 'first set',
      url: '/',
    });

    expect(sub).toHaveBeenCalledTimes(2);
  });

  it('context observable doesnt fires if the context did not change', () => {
    const sub = jest.fn();

    execContext.set({
      type: 'ghf',
      description: 'first set',
    });

    execContext.context$.subscribe(sub);

    execContext.set({
      type: 'ghf',
    });

    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
      type: 'ghf',
      description: 'first set',
      url: '/',
    });

    expect(sub).toHaveBeenCalledTimes(1);
  });

  it('clear resets context and triggers context observable', () => {
    const sub = jest.fn();

    execContext.set({
      type: 'ghf',
      description: 'first set',
    });
    execContext.context$.subscribe(sub);

    execContext.clear();
    expect(sub).toHaveBeenCalledWith({
      name: 'app1',
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
        description: 'inner',
      },
      id: '123',
    });

    expect(execContext.getAsLabels()).toStrictEqual({
      name: 'app1',
      page: 'mypage',
      id: '123',
    });
  });

  it('getAsLabels removes undefined values', () => {
    execContext.set({
      type: 'ghf',
      description: 'first set',
      page: 'mypage',
      id: undefined,
    });

    expect(execContext.get()).toStrictEqual({
      name: 'app1',
      type: 'ghf',
      page: 'mypage',
      url: '/',
      description: 'first set',
      id: undefined,
    });

    expect(execContext.getAsLabels()).toStrictEqual({
      name: 'app1',
      page: 'mypage',
    });
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
