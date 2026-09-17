/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DISPLAY_NAME_STORAGE_KEY } from '../constants';
import type { Comment, CommentsApi, CommentsHostServices } from '../types';
import { createCommentsController } from './comments_controller';

/** A promise settled by the test, to interleave requests. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const target = (): Element => {
  const element = document.getElementById('target');
  if (!element) {
    throw new Error('No target element');
  }
  return element;
};

const comment = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: { username: 'dana', displayName: 'Dana' },
  text: `Comment ${id}`,
  resolved: false,
  replies: [],
  route: { pageKey: '/app/one', path: '/app/one?x=1' },
  anchor: { locators: [{ type: 'id', value: id }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
  ...overrides,
});

const createHost = () => {
  const listeners = new Set<() => void>();
  let path = '/app/one?x=1';
  const api: jest.Mocked<CommentsApi> = {
    list: jest.fn(async () => []),
    getSnapshot: jest.fn(async (_id: string) => undefined),
    create: jest.fn(async (input) => ({ ...input, ...comment('created'), text: input.text })),
    update: jest.fn(async (id, patch) =>
      comment(id, {
        resolved: patch.resolved ?? false,
        replies: patch.reply ? [{ id: 'reply', createdAt: '', ...patch.reply }] : [],
      })
    ),
    exportAll: jest.fn(async () => ({ version: 2 as const, exportedAt: '', comments: [] })),
    importAll: jest.fn(async (_payload) => ({ imported: 0, skipped: 0, failed: 0 })),
  };
  const services: CommentsHostServices = {
    api,
    location: {
      getPageKey: () => path.split(/[?#]/)[0],
      getPath: () => path,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    navigateToPath: jest.fn(async (next: string) => {
      path = next;
      listeners.forEach((listener) => listener());
    }),
    getCurrentUser: jest.fn(async () => ({ username: 'dana', fullName: 'Dana Designer' })),
  };
  return { api, services, navigate: (next: string) => services.navigateToPath(next) };
};

describe('createCommentsController', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="target">Target</button>';
    localStorage.clear();
  });

  describe('loading', () => {
    it('applies only the latest list, and fetches again when a write completed meanwhile', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      const first = deferred<Comment[]>();
      const second = deferred<Comment[]>();
      api.list.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      controller.start();
      await services.navigateToPath('/app/two');
      // The first (stale) list arrives after the second was requested.
      first.resolve([comment('stale')]);
      await flush();
      expect(controller.store.getState().comments).toEqual([]);

      second.resolve([comment('fresh')]);
      await flush();
      expect(controller.store.getState().comments).toEqual([comment('fresh')]);

      // A list requested before a reply completed may not include it: it is fetched again.
      const third = deferred<Comment[]>();
      api.list.mockReturnValueOnce(third.promise).mockResolvedValueOnce([comment('after')]);
      await services.navigateToPath('/app/three');
      expect(api.list).toHaveBeenCalledTimes(3);
      await controller.reply('fresh', 'hello', 'Dana');
      third.resolve([comment('fresh')]);
      await flush();
      expect(api.list).toHaveBeenCalledTimes(4);
      expect(controller.store.getState().comments).toEqual([comment('after')]);
    });

    it('reports a failed load once and ignores results after dispose', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      api.list.mockRejectedValueOnce(new Error('boom'));

      controller.start();
      controller.start();
      await flush();
      expect(controller.store.getState().notice).toEqual({
        type: 'error',
        message: 'Could not load comments: boom',
      });
      expect(api.list).toHaveBeenCalledTimes(1);

      const late = deferred<Comment[]>();
      api.list.mockReturnValueOnce(late.promise);
      await services.navigateToPath('/app/two');
      controller.dispose();
      late.resolve([comment('late')]);
      await flush();
      expect(controller.store.getState().comments).toEqual([]);
    });

    it('signs with the stored display name, falling back to the user, and survives storage failures', async () => {
      const { services } = createHost();
      localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, 'D.');
      const controller = createCommentsController(services);
      controller.start();
      await flush();
      expect(controller.store.getState().author).toEqual({ username: 'dana', displayName: 'D.' });

      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      try {
        controller.pick(target(), { x: 5, y: 5 });
        await controller.save('Hi', { attachScreenshot: false, displayName: ' Dana D. ' });
      } finally {
        setItem.mockRestore();
      }
      expect(controller.store.getState().author?.displayName).toBe('Dana D.');
      expect(controller.store.getState().notice).toBeNull();
    });
  });

  describe('saving', () => {
    it('describes the moment of commenting before the request and completes only the originating draft', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      const create = deferred<Comment>();
      api.create.mockReturnValueOnce(create.promise);
      controller.start();
      await flush();

      controller.setActive(true);
      controller.pick(target(), { x: 5, y: 5 });
      const saving = controller.save('Hello', { attachScreenshot: false, displayName: 'Dana' });
      await flush();
      expect(controller.store.getState().pending?.saving).toBe(true);
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello',
          route: { pageKey: '/app/one', path: '/app/one?x=1' },
          author: { username: 'dana', displayName: 'Dana' },
        })
      );

      // Neither moving nor discarding is possible meanwhile: Escape keeps the draft,
      // and comment mode cannot be left (toolbar button, panel, shortcut).
      controller.pick(target(), { x: 50, y: 5 });
      controller.cancelPending();
      controller.setActive(false);
      controller.toggleActive();
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({
          active: true,
          pending: expect.objectContaining({ saving: true }),
        })
      );

      // The page changes under the save; the draft is dropped but the result is still added.
      await services.navigateToPath('/app/two');
      expect(controller.store.getState().pending).toBeNull();
      create.resolve(comment('created'));
      await saving;
      expect(controller.store.getState().comments.map(({ id }) => id)).toEqual(['created']);
      expect(controller.store.getState().activeThreadId).toBeNull();

      controller.setActive(false);
      expect(controller.store.getState().active).toBe(false);
    });

    it('lets comment mode be left once the save has settled, and reports failures while keeping the draft', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      const create = deferred<Comment>();
      api.create.mockReturnValueOnce(create.promise);
      controller.start();

      controller.setActive(true);
      controller.pick(target(), { x: 5, y: 5 });
      const saving = controller.save('Hello', { attachScreenshot: false, displayName: 'Dana' });
      await flush();
      controller.setActive(false);
      expect(controller.store.getState().active).toBe(true);

      create.reject(new Error('offline'));
      await saving;
      // The failed draft is back in the composer, and can now be given up with the mode.
      expect(controller.store.getState().pending).toEqual(
        expect.objectContaining({ element: target(), saving: false })
      );
      controller.setActive(false);
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ active: false, pending: null })
      );
    });

    it('opens the new comment with its pin focused, and reports failures while keeping the draft', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      controller.start();

      controller.pick(target(), { x: 5, y: 5 });
      await controller.save('Hello', { attachScreenshot: false, displayName: 'Dana' });
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ pending: null, activeThreadId: 'created', focusPinId: 'created' })
      );
      controller.pinFocused('created');
      expect(controller.store.getState().focusPinId).toBeNull();

      api.create.mockRejectedValueOnce(new Error('offline'));
      controller.pick(target(), { x: 5, y: 5 });
      await controller.save('Again', { attachScreenshot: false, displayName: 'Dana' });
      expect(controller.store.getState().pending).toEqual(
        expect.objectContaining({ element: target(), saving: false })
      );
      expect(controller.store.getState().notice).toEqual({
        type: 'error',
        message: 'Could not save the comment: offline',
      });
    });
  });

  describe('threads', () => {
    it('keeps reply drafts until sent, runs one write per comment at a time, and reports failures', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      api.list.mockResolvedValueOnce([comment('a'), comment('b')]);
      controller.start();
      await flush();

      controller.setDraft('a', 'unsent');
      const update = deferred<Comment>();
      api.update.mockReturnValueOnce(update.promise);
      const replying = controller.reply('a', 'unsent', 'Dana');
      await flush();
      expect(controller.store.getState().busyIds.has('a')).toBe(true);
      await controller.setResolved('a', true);
      expect(api.update).toHaveBeenCalledTimes(1);

      update.resolve(comment('a', { replies: [] }));
      await replying;
      expect(controller.store.getState().drafts).toEqual({});
      expect(controller.store.getState().busyIds.size).toBe(0);

      api.update.mockRejectedValueOnce(new Error('conflict'));
      controller.setDraft('b', 'kept');
      await controller.reply('b', 'kept', 'Dana');
      expect(controller.store.getState().drafts).toEqual({ b: 'kept' });
      expect(controller.store.getState().notice?.message).toBe(
        'Could not post the reply: conflict'
      );
    });
  });

  describe('guide', () => {
    it('navigates to the comment page, survives that navigation, and ends on any other', async () => {
      const { services } = createHost();
      const controller = createCommentsController(services);
      controller.start();
      const elsewhere = comment('far', { route: { pageKey: '/app/two', path: '/app/two#/x' } });
      controller.store.setState({ comments: [elsewhere], active: true });

      await controller.guideTo(elsewhere);
      expect(services.navigateToPath).toHaveBeenCalledWith('/app/two#/x');
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ guideId: 'far', pageKey: '/app/two' })
      );

      await services.navigateToPath('/app/three');
      expect(controller.store.getState().guideId).toBeNull();
    });

    it('refuses paths outside of the deployment and rolls back when navigation fails', async () => {
      const { services } = createHost();
      const controller = createCommentsController(services);
      controller.start();

      // The URL parser strips the tab and reads `//evil.example/app`.
      await controller.guideTo(
        comment('evil', { route: { pageKey: '/app/two', path: '/\t/evil.example/app' } })
      );
      expect(services.navigateToPath).not.toHaveBeenCalled();
      expect(controller.store.getState().guideId).toBeNull();
      expect(controller.store.getState().notice?.type).toBe('error');

      (services.navigateToPath as jest.Mock).mockRejectedValueOnce(new Error('no such app'));
      await controller.guideTo(comment('gone', { route: { pageKey: '/x', path: '/x' } }));
      expect(controller.store.getState().guideId).toBeNull();
      expect(controller.store.getState().notice?.message).toBe(
        'Could not open the page of the comment: no such app'
      );
    });

    it('opens the comment with its pin focused when found', () => {
      const { services } = createHost();
      const controller = createCommentsController(services);
      controller.store.setState({ guideId: 'a' });

      controller.stopGuide(true);

      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ guideId: null, activeThreadId: 'a', focusPinId: 'a' })
      );
    });
  });

  it('reports import results, including records that could not be written', async () => {
    const { api, services } = createHost();
    const controller = createCommentsController(services);
    api.importAll.mockResolvedValueOnce({ imported: 2, skipped: 1, failed: 1 });
    controller.start();

    await controller.importFile(new File(['{"comments":[]}'], 'x.json'));

    expect(controller.store.getState().notice).toEqual({
      type: 'success',
      message:
        'Imported 2 comments, skipped 1 that this version cannot read, 1 could not be written.',
    });
  });
});
