/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestScheduler } from 'rxjs/testing';
import { ViewportObserver } from './viewport_observer';

class MockIntersectionObserver implements IntersectionObserver {
  constructor(public callback: IntersectionObserverCallback, opts?: IntersectionObserverInit) {}
  disconnect = jest.fn();
  root = null;
  rootMargin = '';
  takeRecords = jest.fn();
  thresholds = [];
  observe = jest.fn();
  unobserve = jest.fn();
}

describe('ViewportObserver', () => {
  let viewportObserver: ViewportObserver;
  let mockObserver: MockIntersectionObserver;
  function getTestScheduler() {
    return new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  }
  beforeEach(() => {
    viewportObserver = new ViewportObserver((cb, opts) => {
      const mo = new MockIntersectionObserver(cb, opts);
      mockObserver = mo;
      return mo;
    });
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('only observes one element per instance', () => {
    viewportObserver.observeElement(document.createElement('div'));
    viewportObserver.observeElement(document.createElement('div'));
    viewportObserver.observeElement(document.createElement('div'));
    viewportObserver.observeElement(document.createElement('div'));
    expect(mockObserver.observe).toHaveBeenCalledTimes(1);
  });

  test('emits only once', () => {
    expect.assertions(2);
    getTestScheduler().run(({ expectObservable }) => {
      const observe$ = viewportObserver.observeElement(document.createElement('div'));
      mockObserver.callback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver);
      mockObserver.callback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver);
      mockObserver.callback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver);
      mockObserver.callback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver);
      expectObservable(observe$).toBe('(a|)', { a: undefined });
      expect(mockObserver.disconnect).toHaveBeenCalledTimes(4);
    });
  });
});
