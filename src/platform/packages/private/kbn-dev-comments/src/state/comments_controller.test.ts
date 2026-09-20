/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DISPLAY_NAME_STORAGE_KEY } from '../constants';
import { createComment, createLocation, deferred, flush, query, renderPage } from '../test_helpers';
import type { Comment, CommentsApi, CommentsHostServices } from '../types';
import { createCommentsController } from './comments_controller';

const target = () => query('#target');

/** A host at `/app/one?x=1` whose API is mocked and whose navigation changes the location. */
const createHost = () => {
  const { location, navigate } = createLocation('/app/one?x=1');
  const api: jest.Mocked<CommentsApi> = {
    list: jest.fn(async () => []),
    getSnapshot: jest.fn(async (_id: string) => undefined),
    create: jest.fn(async (input) => ({ ...input, ...createComment('created'), text: input.text })),
    update: jest.fn(async (id, patch) =>
      createComment(id, {
        resolved: patch.resolved ?? false,
        replies: patch.reply ? [{ id: 'reply', createdAt: '', ...patch.reply }] : [],
      })
    ),
  };
  const services: CommentsHostServices = {
    api,
    location,
    navigateToPath: jest.fn(async (next: string) => navigate(next)),
    getCurrentUser: jest.fn(async () => ({ username: 'capybara', fullName: 'Capybara Designer' })),
  };
  return { api, services };
};

describe('createCommentsController', () => {
  beforeEach(() => {
    renderPage('<button id="target">Target</button>');
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
      first.resolve([createComment('stale')]);
      await flush();
      expect(controller.store.getState().comments).toEqual([]);

      second.resolve([createComment('fresh')]);
      await flush();
      expect(controller.store.getState().comments).toEqual([createComment('fresh')]);

      // A list requested before a reply completed may not include it: it is fetched again.
      const third = deferred<Comment[]>();
      api.list.mockReturnValueOnce(third.promise).mockResolvedValueOnce([createComment('after')]);
      await services.navigateToPath('/app/three');
      expect(api.list).toHaveBeenCalledTimes(3);
      await controller.reply('fresh', 'hello', 'Capybara');
      third.resolve([createComment('fresh')]);
      await flush();
      expect(api.list).toHaveBeenCalledTimes(4);
      expect(controller.store.getState().comments).toEqual([createComment('after')]);
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
      late.resolve([createComment('late')]);
      await flush();
      expect(controller.store.getState().comments).toEqual([]);
    });

    it('keeps a failed load on record until a reload succeeds, and the list when a later one fails', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      api.list.mockRejectedValueOnce(new Error('boom'));

      controller.start();
      await flush();
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({
          loaded: false,
          loading: false,
          loadedAt: null,
          loadError: 'boom',
          comments: [],
        })
      );

      const retry = deferred<Comment[]>();
      api.list.mockReturnValueOnce(retry.promise);
      const reloading = controller.reload();
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ loaded: false, loading: true, loadError: null })
      );
      retry.resolve([createComment('a')]);
      await reloading;
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({
          loaded: true,
          loading: false,
          loadedAt: expect.any(String),
          loadError: null,
          comments: [createComment('a')],
        })
      );

      api.list.mockRejectedValueOnce(new Error('offline'));
      await services.navigateToPath('/app/two');
      await flush();
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({
          loaded: true,
          loadError: 'offline',
          comments: [createComment('a')],
        })
      );
    });

    it('fetches again on request, keeping the comment and the reply being written', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      controller.start();
      await flush();
      controller.setActive(true);
      controller.pick(target(), { x: 1, y: 1 });
      controller.setDraft('a', 'Draft');
      const { pending } = controller.store.getState();

      await controller.reload();
      expect(api.list).toHaveBeenCalledTimes(2);
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ pending, drafts: { a: 'Draft' }, active: true })
      );
    });

    it('signs with the stored display name, falling back to the user, and survives storage failures', async () => {
      const { services } = createHost();
      localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, 'D.');
      const controller = createCommentsController(services);
      controller.start();
      await flush();
      expect(controller.store.getState().author).toEqual({
        username: 'capybara',
        displayName: 'D.',
      });

      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      try {
        controller.pick(target(), { x: 5, y: 5 });
        await controller.save('Hi', { attachScreenshot: false, displayName: ' Capybara D. ' });
      } finally {
        setItem.mockRestore();
      }
      expect(controller.store.getState().author?.displayName).toBe('Capybara D.');
      expect(controller.store.getState().notice).toBeNull();
    });
  });

  describe('saving', () => {
    it('describes the moment of commenting before the request and keeps the draft until the save settles', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      const create = deferred<Comment>();
      api.create.mockReturnValueOnce(create.promise);
      controller.start();
      await flush();

      controller.setActive(true);
      controller.pick(target(), { x: 5, y: 5 });
      const saving = controller.save('Hello', { attachScreenshot: false, displayName: 'Capybara' });
      await flush();
      expect(controller.store.getState().pending?.saving).toBe(true);
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello',
          route: { pageKey: '/app/one', path: '/app/one?x=1' },
          author: { username: 'capybara', displayName: 'Capybara' },
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

      // The page changes under the save; the draft stays until the result is in, which is
      // added without being opened: its pin is on the page it was made on.
      await services.navigateToPath('/app/two');
      expect(controller.store.getState().pending).toEqual(
        expect.objectContaining({ saving: true })
      );
      create.resolve(createComment('created'));
      await saving;
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ pending: null, activeThreadId: null, focusPinId: null })
      );
      expect(controller.store.getState().comments.map(({ id }) => id)).toEqual(['created']);

      controller.setActive(false);
      expect(controller.store.getState().active).toBe(false);
    });

    it('hands a draft back when its save fails after the page changed, and then saves it for the page it was made on', async () => {
      const { api, services } = createHost();
      const captureViewport = jest.fn(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 0; // nothing to encode in jsdom; the capture is what is checked
        return canvas;
      });
      const controller = createCommentsController({ ...services, captureViewport });
      const create = deferred<Comment>();
      api.create.mockReturnValueOnce(create.promise);
      controller.start();

      controller.setActive(true);
      controller.pick(target(), { x: 5, y: 5 });
      const saving = controller.save('Hello', { attachScreenshot: true, displayName: 'Capybara' });
      await flush();
      expect(captureViewport).toHaveBeenCalledTimes(1);
      await services.navigateToPath('/app/two');
      create.reject(new Error('offline'));
      await saving;

      expect(controller.store.getState()).toEqual(
        expect.objectContaining({
          pageKey: '/app/two',
          pending: expect.objectContaining({ element: target(), saving: false }),
          notice: { type: 'error', message: 'Could not save the comment: offline' },
        })
      );

      // Saved again, the comment is made where its element was, without a screenshot of this page.
      await controller.save('Hello', { attachScreenshot: true, displayName: 'Capybara' });
      expect(captureViewport).toHaveBeenCalledTimes(1);
      expect(api.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ route: { pageKey: '/app/one', path: '/app/one?x=1' } })
      );
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ pending: null, activeThreadId: null })
      );
      expect(controller.store.getState().comments).toHaveLength(1);
    });

    it('opens the new comment with its pin focused, and reports failures while keeping the draft', async () => {
      const { api, services } = createHost();
      const controller = createCommentsController(services);
      controller.start();

      controller.pick(target(), { x: 5, y: 5 });
      await controller.save('Hello', { attachScreenshot: false, displayName: 'Capybara' });
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ pending: null, activeThreadId: 'created', focusPinId: 'created' })
      );
      controller.pinFocused('created');
      expect(controller.store.getState().focusPinId).toBeNull();

      api.create.mockRejectedValueOnce(new Error('offline'));
      controller.pick(target(), { x: 5, y: 5 });
      await controller.save('Again', { attachScreenshot: false, displayName: 'Capybara' });
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
      api.list.mockResolvedValueOnce([createComment('a'), createComment('b')]);
      controller.start();
      await flush();

      controller.setDraft('a', 'unsent');
      const update = deferred<Comment>();
      api.update.mockReturnValueOnce(update.promise);
      const replying = controller.reply('a', 'unsent', 'Capybara');
      await flush();
      expect(controller.store.getState().busyIds.has('a')).toBe(true);
      await controller.setResolved('a', true);
      expect(api.update).toHaveBeenCalledTimes(1);

      update.resolve(createComment('a', { replies: [] }));
      await replying;
      expect(controller.store.getState().drafts).toEqual({});
      expect(controller.store.getState().busyIds.size).toBe(0);

      api.update.mockRejectedValueOnce(new Error('conflict'));
      controller.setDraft('b', 'kept');
      await controller.reply('b', 'kept', 'Capybara');
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
      const elsewhere = createComment('far', {
        route: { pageKey: '/app/two', path: '/app/two#/x' },
      });
      controller.store.setState({ comments: [elsewhere], active: true });

      await controller.guideTo(elsewhere);
      expect(services.navigateToPath).toHaveBeenCalledWith('/app/two#/x');
      expect(controller.store.getState()).toEqual(
        expect.objectContaining({ guide: { id: 'far', navigating: false }, pageKey: '/app/two' })
      );

      await services.navigateToPath('/app/three');
      expect(controller.store.getState().guide).toBeNull();
    });

    it('is navigating until the host has opened the page, unless it is open already', async () => {
      const { services } = createHost();
      const controller = createCommentsController(services);
      controller.start();
      // Same page, other state: the page key does not tell the two apart.
      const navigation = deferred<void>();
      (services.navigateToPath as jest.Mock).mockReturnValueOnce(navigation.promise);
      const otherState = createComment('other', {
        route: { pageKey: '/app/one', path: '/app/one?x=2' },
      });

      const guiding = controller.guideTo(otherState);
      expect(controller.store.getState().guide).toEqual({ id: 'other', navigating: true });
      navigation.resolve();
      await guiding;
      expect(controller.store.getState().guide).toEqual({ id: 'other', navigating: false });

      const here = createComment('here', { route: { pageKey: '/app/one', path: '/app/one?x=1' } });
      void controller.guideTo(here);
      expect(controller.store.getState().guide).toEqual({ id: 'here', navigating: false });
      expect(services.navigateToPath).toHaveBeenCalledTimes(1);
    });

    it('does not bring back a guide that was stopped while its page was opening', async () => {
      const { services } = createHost();
      const controller = createCommentsController(services);
      controller.start();
      const navigation = deferred<void>();
      (services.navigateToPath as jest.Mock).mockReturnValueOnce(navigation.promise);

      const guiding = controller.guideTo(
        createComment('slow', { route: { pageKey: '/app/two', path: '/app/two' } })
      );
      controller.stopGuide();
      navigation.resolve();
      await guiding;
      expect(controller.store.getState().guide).toBeNull();
    });

    it('rolls back and reports when the host will not or cannot open the page', async () => {
      const { services } = createHost();
      const controller = createCommentsController(services);
      controller.start();

      (services.navigateToPath as jest.Mock).mockRejectedValueOnce(new Error('no such app'));
      await controller.guideTo(createComment('gone', { route: { pageKey: '/x', path: '/x' } }));
      expect(controller.store.getState().guide).toBeNull();
      expect(controller.store.getState().notice).toEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Could not open the page of the comment: no such app',
        })
      );
    });
  });
});
