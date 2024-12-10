/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreScopedHistory as ScopedHistory } from './scoped_history';
import { createMemoryHistory, History } from 'history';
import type { ConfirmHandler } from './navigation_confirm';

describe('ScopedHistory', () => {
  describe('construction', () => {
    it('succeeds if current location matches basePath', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      expect(() => new ScopedHistory(gh, '/app/wow')).not.toThrow();
      gh.push('/app/wow/');
      expect(() => new ScopedHistory(gh, '/app/wow')).not.toThrow();
      gh.push('/app/wow/sub-page');
      expect(() => new ScopedHistory(gh, '/app/wow')).not.toThrow();
    });

    it('fails if current location does not match basePath', () => {
      const gh = createMemoryHistory();
      gh.push('/app/other');
      expect(() => new ScopedHistory(gh, '/app/wow')).toThrowErrorMatchingInlineSnapshot(
        `"Browser location [/app/other] is not currently in expected basePath [/app/wow]"`
      );
    });
  });

  describe('navigation', () => {
    it('supports push', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const pushSpy = jest.spyOn(gh, 'push');
      const h = new ScopedHistory(gh, '/app/wow');
      h.push('/new-page', { some: 'state' });
      expect(pushSpy).toHaveBeenCalledWith('/app/wow/new-page', { some: 'state' });
      expect(gh.length).toBe(3); // ['', '/app/wow', '/app/wow/new-page']
      expect(h.length).toBe(2);
    });

    it('supports unbound push', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const pushSpy = jest.spyOn(gh, 'push');
      const h = new ScopedHistory(gh, '/app/wow');
      const { push } = h;
      push('/new-page', { some: 'state' });
      expect(pushSpy).toHaveBeenCalledWith('/app/wow/new-page', { some: 'state' });
      expect(gh.length).toBe(3); // ['', '/app/wow', '/app/wow/new-page']
      expect(h.length).toBe(2);
    });

    it('supports replace', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const replaceSpy = jest.spyOn(gh, 'replace');
      const h = new ScopedHistory(gh, '/app/wow'); // ['']
      h.push('/first-page'); // ['', '/first-page']
      h.push('/second-page'); // ['', '/first-page', '/second-page']
      h.goBack(); // ['', '/first-page', '/second-page']
      h.replace('/first-page-replacement', { some: 'state' }); // ['', '/first-page-replacement', '/second-page']
      expect(replaceSpy).toHaveBeenCalledWith('/app/wow/first-page-replacement', { some: 'state' });
      expect(h.length).toBe(3);
      expect(gh.length).toBe(4); // ['', '/app/wow', '/app/wow/first-page-replacement', '/app/wow/second-page']
    });

    it('hides previous stack', () => {
      const gh = createMemoryHistory();
      gh.push('/app/alpha');
      gh.push('/app/beta');
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      expect(h.length).toBe(1);
      expect(h.location.pathname).toEqual('');
    });

    it('cannot go back further than local stack', () => {
      const gh = createMemoryHistory();
      gh.push('/app/alpha');
      gh.push('/app/beta');
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      h.push('/new-page');
      expect(h.length).toBe(2);
      expect(h.location.pathname).toEqual('/new-page');

      // Test first back
      h.goBack();
      expect(h.length).toBe(2);
      expect(h.location.pathname).toEqual('');
      expect(gh.location.pathname).toEqual('/app/wow');

      // Second back should be no-op
      h.goBack();
      expect(h.length).toBe(2);
      expect(h.location.pathname).toEqual('');
      expect(gh.location.pathname).toEqual('/app/wow');
    });

    it('cannot go forward further than local stack', () => {
      const gh = createMemoryHistory();
      gh.push('/app/alpha');
      gh.push('/app/beta');
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      h.push('/new-page');
      expect(h.length).toBe(2);

      // Go back so we can go forward
      h.goBack();
      expect(h.length).toBe(2);
      expect(h.location.pathname).toEqual('');
      expect(gh.location.pathname).toEqual('/app/wow');

      // Going forward should increase length and return to /new-page
      h.goForward();
      expect(h.length).toBe(2);
      expect(h.location.pathname).toEqual('/new-page');
      expect(gh.location.pathname).toEqual('/app/wow/new-page');

      // Second forward should be no-op
      h.goForward();
      expect(h.length).toBe(2);
      expect(h.location.pathname).toEqual('/new-page');
      expect(gh.location.pathname).toEqual('/app/wow/new-page');
    });

    it('reacts to navigations from parent history', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      h.push('/page-1');
      h.push('/page-2');

      gh.goBack();
      expect(h.location.pathname).toEqual('/page-1');
      expect(h.length).toBe(3);

      gh.goForward();
      expect(h.location.pathname).toEqual('/page-2');
      expect(h.length).toBe(3);

      // Go back to /app/wow and push a new location
      gh.goBack();
      gh.goBack();
      gh.push('/app/wow/page-3');
      expect(h.location.pathname).toEqual('/page-3');
      expect(h.length).toBe(2); // ['', '/page-3']
    });

    it('increments length on push and removes length when going back and then pushing', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      expect(gh.length).toBe(2);
      const h = new ScopedHistory(gh, '/app/wow');
      expect(h.length).toBe(1);
      h.push('/page1');
      expect(h.length).toBe(2);
      h.push('/page2');
      expect(h.length).toBe(3);
      h.push('/page3');
      expect(h.length).toBe(4);
      h.push('/page4');
      expect(h.length).toBe(5);
      h.push('/page5');
      expect(h.length).toBe(6);
      h.goBack(); // back/forward should not reduce the length
      expect(h.length).toBe(6);
      h.goBack();
      expect(h.length).toBe(6);
      h.push('/page6'); // length should only change if a new location is pushed from a point further back in the history
      expect(h.length).toBe(5);
      h.goBack();
      expect(h.length).toBe(5);
      h.goBack();
      expect(h.length).toBe(5);
      h.push('/page7');
      expect(h.length).toBe(4);
    });
  });

  describe('teardown behavior', () => {
    it('throws exceptions after falling out of scope', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      expect(gh.length).toBe(2);
      const h = new ScopedHistory(gh, '/app/wow');
      gh.push('/app/other');
      expect(() => h.location).toThrowErrorMatchingInlineSnapshot(
        `"ScopedHistory instance has fell out of navigation scope for basePath: /app/wow"`
      );
      expect(() => h.push('/new-page')).toThrow();
      expect(() => h.replace('/new-page')).toThrow();
      expect(() => h.goBack()).toThrow();
      expect(() => h.goForward()).toThrow();
    });
  });

  describe('listen', () => {
    it('calls callback with scoped location', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      const listenPaths: string[] = [];
      h.listen((l) => listenPaths.push(l.pathname));
      h.push('/first-page');
      h.push('/second-page');
      h.push('/third-page');
      h.go(-2);
      h.goForward();
      expect(listenPaths).toEqual([
        '/first-page',
        '/second-page',
        '/third-page',
        '/first-page',
        '/second-page',
      ]);
    });

    it('stops calling callback after unlisten is called', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      const listenPaths: string[] = [];
      const unlisten = h.listen((l) => listenPaths.push(l.pathname));
      h.push('/first-page');
      unlisten();
      h.push('/second-page');
      h.push('/third-page');
      h.go(-2);
      h.goForward();
      expect(listenPaths).toEqual(['/first-page']);
    });

    it('stops calling callback after browser leaves scope', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      const listenPaths: string[] = [];
      h.listen((l) => listenPaths.push(l.pathname));
      h.push('/first-page');
      gh.push('/app/other');
      gh.push('/second-page');
      gh.push('/third-page');
      gh.go(-2);
      gh.goForward();
      expect(listenPaths).toEqual(['/first-page']);
    });
  });

  describe('createHref', () => {
    it('creates scoped hrefs', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      expect(h.createHref({ pathname: '' })).toEqual(`/app/wow`);
      expect(h.createHref({})).toEqual(`/app/wow`);
      expect(h.createHref({ pathname: '/new-page', search: '?alpha=true' })).toEqual(
        `/app/wow/new-page?alpha=true`
      );
    });

    it('behave correctly with slash-ending basePath', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow/');
      const h = new ScopedHistory(gh, '/app/wow/');
      expect(h.createHref({ pathname: '' })).toEqual(`/app/wow/`);
      expect(h.createHref({ pathname: '/new-page', search: '?alpha=true' })).toEqual(
        `/app/wow/new-page?alpha=true`
      );
    });

    it('skips the scoped history path when `prependBasePath` is false', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const h = new ScopedHistory(gh, '/app/wow');
      expect(h.createHref({ pathname: '' }, { prependBasePath: false })).toEqual(`/`);
      expect(
        h.createHref({ pathname: '/new-page', search: '?alpha=true' }, { prependBasePath: false })
      ).toEqual(`/new-page?alpha=true`);
    });
  });

  describe('action', () => {
    it('provides last history action', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      gh.push('/alpha');
      gh.goBack();
      const h = new ScopedHistory(gh, '/app/wow');
      expect(h.action).toBe('POP');
      gh.push('/app/wow/page-1');
      expect(h.action).toBe('PUSH');
      h.replace('/page-2');
      expect(h.action).toBe('REPLACE');
    });
  });

  describe('createSubHistory', () => {
    it('supports push', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const ghPushSpy = jest.spyOn(gh, 'push');
      const h1 = new ScopedHistory(gh, '/app/wow');
      h1.push('/new-page');
      const h1PushSpy = jest.spyOn(h1, 'push');
      const h2 = h1.createSubHistory('/new-page');
      h2.push('/sub-page', { some: 'state' });
      expect(h1PushSpy).toHaveBeenCalledWith('/new-page/sub-page', { some: 'state' });
      expect(ghPushSpy).toHaveBeenCalledWith('/app/wow/new-page/sub-page', { some: 'state' });
      expect(h2.length).toBe(2);
      expect(h1.length).toBe(3);
      expect(gh.length).toBe(4);
    });

    it('supports replace', () => {
      const gh = createMemoryHistory();
      gh.push('/app/wow');
      const ghReplaceSpy = jest.spyOn(gh, 'replace');
      const h1 = new ScopedHistory(gh, '/app/wow');
      h1.push('/new-page');
      const h1ReplaceSpy = jest.spyOn(h1, 'replace');
      const h2 = h1.createSubHistory('/new-page');
      h2.push('/sub-page');
      h2.replace('/other-sub-page', { some: 'state' });
      expect(h1ReplaceSpy).toHaveBeenCalledWith('/new-page/other-sub-page', { some: 'state' });
      expect(ghReplaceSpy).toHaveBeenCalledWith('/app/wow/new-page/other-sub-page', {
        some: 'state',
      });
      expect(h2.length).toBe(2);
      expect(h1.length).toBe(3);
      expect(gh.length).toBe(4);
    });
  });

  describe('block', () => {
    let gh: History;
    let h: ScopedHistory;

    const initHistory = ({
      initialPath = '/app/wow',
      scopedHistoryPath = '/app/wow',
      confirmHandler,
    }: {
      initialPath?: string;
      scopedHistoryPath?: string;
      confirmHandler?: ConfirmHandler;
    } = {}) => {
      gh = createMemoryHistory({
        getUserConfirmation: confirmHandler,
      });
      gh.push(initialPath);
      h = new ScopedHistory(gh, scopedHistoryPath);
    };

    it('calls block on the global history', () => {
      initHistory();

      const blockSpy = jest.spyOn(gh, 'block');
      h.block('confirm');

      expect(blockSpy).toHaveBeenCalledTimes(1);
      expect(blockSpy).toHaveBeenCalledWith('confirm');
    });

    it('returns a wrapped unregister function', () => {
      initHistory();

      const blockSpy = jest.spyOn(gh, 'block');
      const unregister = jest.fn();
      blockSpy.mockReturnValue(unregister);

      const wrapperUnregister = h.block('confirm');

      expect(unregister).not.toHaveBeenCalled();

      wrapperUnregister();

      expect(unregister).toHaveBeenCalledTimes(1);
    });

    it('calls the block handler when navigating to another app', () => {
      initHistory();

      const blockHandler = jest.fn().mockReturnValue(true);

      h.block(blockHandler);

      gh.push('/app/other');

      expect(blockHandler).toHaveBeenCalledTimes(1);
      expect(gh.location.pathname).toEqual('/app/other');
    });

    it('calls the block handler when navigating inside the current app', () => {
      initHistory();

      const blockHandler = jest.fn().mockReturnValue(true);

      h.block(blockHandler);

      gh.push('/app/wow/another-page');

      expect(blockHandler).toHaveBeenCalledTimes(1);
      expect(gh.location.pathname).toEqual('/app/wow/another-page');
    });

    it('can block the navigation', () => {
      initHistory();

      const blockHandler = jest.fn().mockReturnValue(false);

      h.block(blockHandler);

      gh.push('/app/other');

      expect(blockHandler).toHaveBeenCalledTimes(1);
      expect(gh.location.pathname).toEqual('/app/wow');
    });

    it('no longer blocks the navigation when unregistered', () => {
      initHistory();

      const blockHandler = jest.fn().mockReturnValue(false);

      const unregister = h.block(blockHandler);

      gh.push('/app/other');

      expect(gh.location.pathname).toEqual('/app/wow');

      unregister();

      gh.push('/app/other');

      expect(gh.location.pathname).toEqual('/app/other');
    });

    it('throws if the history is no longer active', () => {
      initHistory();

      gh.push('/app/other');

      expect(() => h.block()).toThrowErrorMatchingInlineSnapshot(
        `"ScopedHistory instance has fell out of navigation scope for basePath: /app/wow"`
      );
    });

    it('unregisters the block handler when the history is no longer active', () => {
      initHistory();

      const blockSpy = jest.spyOn(gh, 'block');
      const unregister = jest.fn();
      blockSpy.mockReturnValue(unregister);

      h.block('confirm');

      expect(unregister).not.toHaveBeenCalled();

      gh.push('/app/other');

      expect(unregister).toHaveBeenCalledTimes(1);
    });

    it('calls the defined global history confirm handler', () => {
      const confirmHandler: jest.MockedFunction<ConfirmHandler> = jest
        .fn()
        .mockImplementation((message, callback) => {
          callback(true);
        });

      initHistory({
        confirmHandler,
      });

      h.block('are you sure');

      gh.push('/app/other');

      expect(confirmHandler).toHaveBeenCalledTimes(1);
      expect(gh.location.pathname).toEqual('/app/other');
    });
  });
});
