/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DISPLAY_NAME_STORAGE_KEY } from '../constants';
import { buildAnchor } from '../lib/anchor';
import { createSnapshot } from '../lib/snapshot';
import { createTrailRecorder } from '../lib/trail';
import type {
  Comment,
  CommentAuthor,
  CommentRoute,
  CommentsHostServices,
  CommentsUser,
  ElementAnchor,
  NewComment,
  TrailStep,
} from '../types';
import { createStore, type Store } from './store';

export interface PendingComment {
  /** Tells drafts apart: a save only completes the draft it started from. */
  id: number;
  element: Element;
  anchor: ElementAnchor;
  /** Viewport coordinates of the click, used when `element` leaves the DOM before the comment is saved. */
  point: { x: number; y: number };
  /** The page the element was picked on; the comment is made there even when the page changes under its save. */
  route: CommentRoute;
  /** The author's clicks on that page up to the pick, see `Comment.trail`. */
  trail: TrailStep[];
  /** The draft is being saved; until that ends it can neither move nor be discarded. */
  saving: boolean;
}

export interface CommentsNotice {
  type: 'success' | 'error';
  message: string;
}

export interface GuideState {
  /** The comment being guided to. */
  id: string;
  /** The host is still opening the comment's page; until it has, the guide does not look at the page. */
  navigating: boolean;
}

export interface CommentsState {
  pageKey: string;
  /** Every comment, on every page; only the current page's get pins. */
  comments: Comment[];
  /** The list has been fetched at least once; before that, `comments` is not known to be empty. */
  loaded: boolean;
  /** Why the list could not be fetched the last time, until it is fetched again. */
  loadError: string | null;
  /** Comment mode: the page is not interactable and a click on it starts a comment. */
  active: boolean;
  panelMinimized: boolean;
  activeThreadId: string | null;
  /** Pin that should take focus once it is rendered: its thread was opened without a pointer. */
  focusPinId: string | null;
  pending: PendingComment | null;
  guide: GuideState | null;
  /** An overlay opened from the layer (full-screen screenshot) is showing; the layer sits below its mask meanwhile. */
  overlayOpen: boolean;
  author: CommentAuthor | null;
  notice: CommentsNotice | null;
  /** Unsent reply text by comment id; kept while threads unmount (their pin leaves the viewport). */
  drafts: Record<string, string>;
  /** Comments with a reply or resolve request in flight. */
  busyIds: ReadonlySet<string>;
}

export interface CommentsController {
  store: Store<CommentsState>;
  services: CommentsHostServices;
  ignoreSelectors: readonly string[];
  start(): void;
  dispose(): void;
  reload(): Promise<void>;
  /** Leaving comment mode drops any comment being written; while one is being saved, the mode cannot be changed. */
  setActive(active: boolean): void;
  toggleActive(): void;
  setPanelMinimized(minimized: boolean): void;
  /** Starts (or moves) a comment on `element`; `hit` is the innermost element under the pointer, which the pin follows. Ignored while a draft is being saved. */
  pick(element: Element, point: { x: number; y: number }, hit?: Element): void;
  cancelPending(): void;
  /** `displayName` signs this and future comments. Failures are reported as a notice. */
  save(text: string, options: { attachScreenshot: boolean; displayName: string }): Promise<void>;
  reply(id: string, text: string, displayName: string): Promise<void>;
  setResolved(id: string, resolved: boolean): Promise<void>;
  setDraft(id: string, text: string): void;
  /** With `focusPin`, the thread's pin takes focus once rendered. */
  openThread(id: string | null, options?: { focusPin?: boolean }): void;
  /** Called by a pin once it took the focus requested through `focusPinId`. */
  pinFocused(id: string): void;
  /** Opens the page the comment was made on and guides the reader through the author's clicks. */
  guideTo(comment: Comment): Promise<void>;
  /** Ends the guide; with `found`, opens the comment it led to. */
  stopGuide(found?: boolean): void;
  setOverlayOpen(open: boolean): void;
  dismissNotice(): void;
}

const NOTICE_TIMEOUT_MS = 4000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Storage can be disabled or full (private browsing); the name then lasts for the session only.
const readStoredDisplayName = (): string => {
  try {
    return localStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const storeDisplayName = (displayName: string) => {
  try {
    localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName);
  } catch {
    // see above
  }
};

/** Drops the draft, unless it is being saved: a save cannot be discarded. */
const droppingDraft = (state: CommentsState): Partial<CommentsState> =>
  state.pending?.saving ? {} : { pending: null };

export const createCommentsController = (services: CommentsHostServices): CommentsController => {
  const { api, location } = services;
  const ignoreSelectors = services.ignoreSelectors ?? [];

  const store = createStore<CommentsState>({
    pageKey: location.getPageKey(),
    comments: [],
    loaded: false,
    loadError: null,
    active: false,
    panelMinimized: false,
    activeThreadId: null,
    focusPinId: null,
    pending: null,
    guide: null,
    overlayOpen: false,
    author: null,
    notice: null,
    drafts: {},
    busyIds: new Set(),
  });

  const trail = createTrailRecorder({
    location,
    ignoreSelectors,
    // Page clicks in comment mode place pins instead of acting, except while a guide runs.
    isRecording: () => {
      const { active, guide } = store.getState();
      return !active || guide !== null;
    },
  });

  let started = false;
  let unsubscribeLocation: (() => void) | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let draftSequence = 0;
  let loadSequence = 0;
  /** Completed writes; a list fetched while one completed may predate it and is fetched again instead. */
  let writes = 0;

  const notify = (type: CommentsNotice['type'], message: string) => {
    clearTimeout(noticeTimer);
    store.setState({ notice: { type, message } });
    noticeTimer = setTimeout(() => store.setState({ notice: null }), NOTICE_TIMEOUT_MS);
  };

  const replaceComment = (updated: Comment) =>
    store.setState((state) => ({
      comments: state.comments.map((comment) => (comment.id === updated.id ? updated : comment)),
    }));

  const setBusy = (id: string, busy: boolean) =>
    store.setState(({ busyIds }) => {
      const next = new Set(busyIds);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { busyIds: next };
    });

  const load = async (): Promise<void> => {
    const sequence = ++loadSequence;
    const writesBefore = writes;
    if (store.getState().loadError) {
      store.setState({ loadError: null });
    }
    try {
      const comments = await api.list();
      if (!started || sequence !== loadSequence) {
        return;
      }
      if (writes !== writesBefore) {
        return load();
      }
      store.setState({ comments, loaded: true });
    } catch (error) {
      if (started && sequence === loadSequence) {
        const message = errorMessage(error);
        store.setState({ loadError: message });
        notify(
          'error',
          i18n.translate('devComments.notice.loadFailed', {
            defaultMessage: 'Could not load comments: {message}',
            values: { message },
          })
        );
      }
    }
  };

  const loadAuthor = async () => {
    const user = await services
      .getCurrentUser()
      .catch((): CommentsUser => ({ username: 'anonymous' }));
    if (!started) {
      return;
    }
    const displayName = readStoredDisplayName() || user.fullName || user.username;
    store.setState({ author: { username: user.username, displayName } });
  };

  const signAs = (displayName: string): CommentAuthor => {
    const author = {
      username: store.getState().author?.username ?? 'anonymous',
      displayName: displayName.trim(),
    };
    storeDisplayName(author.displayName);
    store.setState({ author });
    return author;
  };

  /** Runs one write on a comment at a time and puts its result in the store; false when it did not run or failed. */
  const mutate = async (
    id: string,
    request: () => Promise<Comment>,
    failureMessage: (message: string) => string
  ): Promise<boolean> => {
    if (store.getState().busyIds.has(id)) {
      return false;
    }
    setBusy(id, true);
    try {
      const updated = await request();
      writes += 1;
      replaceComment(updated);
      return true;
    } catch (error) {
      notify('error', failureMessage(errorMessage(error)));
      return false;
    } finally {
      setBusy(id, false);
    }
  };

  const onLocationChange = () => {
    const pageKey = location.getPageKey();
    const { pageKey: previous, guide, comments } = store.getState();
    if (pageKey === previous) {
      return;
    }
    // A guide survives the navigation it asked for (to the comment's page), nothing
    // else; a draft being saved is kept until the save settles, so that a failure
    // can hand it back with its text instead of losing it.
    const guided = guide && comments.find(({ id }) => id === guide.id);
    store.setState((state) => ({
      pageKey,
      activeThreadId: null,
      focusPinId: null,
      guide: guided?.route.pageKey === pageKey ? guide : null,
      ...droppingDraft(state),
    }));
    void load();
  };

  // Every way out of comment mode (toolbar button, panel, shortcut) ends here; a
  // draft being saved must not be dropped by any of them, so the mode waits for it.
  const setActive = (active: boolean) => {
    if (store.getState().pending?.saving) {
      return;
    }
    store.setState({
      active,
      pending: null,
      activeThreadId: null,
      focusPinId: null,
      guide: null,
      ...(active ? {} : { panelMinimized: false }),
    });
  };

  return {
    store,
    services,
    ignoreSelectors,

    start() {
      if (started) {
        return;
      }
      started = true;
      unsubscribeLocation = location.subscribe(onLocationChange);
      trail.start();
      void load();
      void loadAuthor();
    },

    dispose() {
      if (!started) {
        return;
      }
      started = false;
      unsubscribeLocation?.();
      unsubscribeLocation = undefined;
      trail.stop();
      clearTimeout(noticeTimer);
    },

    reload: load,

    setActive,

    toggleActive() {
      setActive(!store.getState().active);
    },

    setPanelMinimized(minimized) {
      store.setState({ panelMinimized: minimized });
    },

    pick(element, point, hit) {
      if (store.getState().pending?.saving) {
        return;
      }
      // The draft describes the moment of commenting: the element, the page it is on
      // and the clicks that led there. Saving takes time, during which the page may change.
      store.setState({
        pending: {
          id: ++draftSequence,
          element,
          anchor: buildAnchor(element, { point, hit }),
          point,
          route: { pageKey: location.getPageKey(), path: location.getPath() },
          trail: trail.steps(),
          saving: false,
        },
        activeThreadId: null,
        focusPinId: null,
      });
    },

    cancelPending() {
      store.setState(droppingDraft);
    },

    async save(text, { attachScreenshot, displayName }) {
      const draft = store.getState().pending;
      if (!draft || draft.saving) {
        return;
      }
      const input: NewComment = {
        author: signAs(displayName),
        text: text.trim(),
        resolved: false,
        replies: [],
        route: draft.route,
        anchor: draft.anchor,
        trail: draft.trail,
      };
      const updateDraft = (changes: Partial<PendingComment>) =>
        store.setState((state) =>
          state.pending?.id === draft.id ? { pending: { ...state.pending, ...changes } } : {}
        );
      updateDraft({ saving: true });
      try {
        const { captureViewport } = services;
        // The screenshot shows the page the comment is about; a draft handed back by a
        // failed save after the page changed is saved without one.
        const snapshot =
          attachScreenshot && captureViewport && location.getPageKey() === draft.route.pageKey
            ? await createSnapshot(captureViewport)
            : undefined;
        const created = await api.create({ ...input, ...(snapshot ? { snapshot } : {}) });
        writes += 1;
        // The new comment opens with its pin focused, unless the page changed under
        // the save: its pin is on the page it was made on.
        store.setState((state) => ({
          comments: [...state.comments, created],
          ...(state.pending?.id === draft.id ? { pending: null } : {}),
          ...(state.pending?.id === draft.id && state.pageKey === draft.route.pageKey
            ? { activeThreadId: created.id, focusPinId: created.id }
            : {}),
        }));
      } catch (error) {
        notify(
          'error',
          i18n.translate('devComments.notice.saveFailed', {
            defaultMessage: 'Could not save the comment: {message}',
            values: { message: errorMessage(error) },
          })
        );
        updateDraft({ saving: false });
      }
    },

    async reply(id, text, displayName) {
      const sent = await mutate(
        id,
        () => api.update(id, { reply: { author: signAs(displayName), text: text.trim() } }),
        (message) =>
          i18n.translate('devComments.notice.replyFailed', {
            defaultMessage: 'Could not post the reply: {message}',
            values: { message },
          })
      );
      if (sent) {
        store.setState(({ drafts: { [id]: draft, ...drafts } }) => ({ drafts }));
      }
    },

    async setResolved(id, resolved) {
      await mutate(
        id,
        () => api.update(id, { resolved }),
        (message) =>
          i18n.translate('devComments.notice.resolveFailed', {
            defaultMessage: 'Could not update the comment: {message}',
            values: { message },
          })
      );
    },

    setDraft(id, text) {
      store.setState(({ drafts }) => ({ drafts: { ...drafts, [id]: text } }));
    },

    openThread(id, { focusPin = false } = {}) {
      store.setState((state) => ({
        activeThreadId: id,
        focusPinId: focusPin ? id : null,
        ...(id ? droppingDraft(state) : {}),
      }));
    },

    pinFocused(id) {
      if (store.getState().focusPinId === id) {
        store.setState({ focusPinId: null });
      }
    },

    async guideTo(comment) {
      const { id, route } = comment;
      // The page is not looked at until the host has opened the comment's one: the
      // current page may be the same one in another state, with a matching element.
      const guide: GuideState = { id, navigating: route.path !== location.getPath() };
      store.setState((state) => ({
        guide,
        activeThreadId: null,
        focusPinId: null,
        ...droppingDraft(state),
      }));
      if (!guide.navigating) {
        return;
      }
      // Meanwhile the guide may have been stopped, or started over.
      const current = () => store.getState().guide === guide;
      try {
        await services.navigateToPath(route.path);
        if (current()) {
          store.setState({ guide: { id, navigating: false } });
        }
      } catch (error) {
        if (current()) {
          store.setState({ guide: null });
        }
        notify(
          'error',
          i18n.translate('devComments.notice.navigateFailed', {
            defaultMessage: 'Could not open the page of the comment: {message}',
            values: { message: errorMessage(error) },
          })
        );
      }
    },

    stopGuide(found = false) {
      const { guide } = store.getState();
      if (!guide) {
        return;
      }
      store.setState({
        guide: null,
        ...(found ? { activeThreadId: guide.id, focusPinId: guide.id } : {}),
      });
    },

    setOverlayOpen(open) {
      store.setState({ overlayOpen: open });
    },

    dismissNotice() {
      clearTimeout(noticeTimer);
      store.setState({ notice: null });
    },
  };
};
