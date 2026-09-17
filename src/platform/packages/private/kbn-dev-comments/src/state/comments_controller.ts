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
import { isSafeRelativePath } from '../lib/route';
import { createSnapshot } from '../lib/snapshot';
import { createTrailRecorder } from '../lib/trail';
import type {
  Comment,
  CommentAuthor,
  CommentsHostServices,
  CommentsUser,
  ElementAnchor,
  NewComment,
} from '../types';
import { createStore, type Store } from './store';

export interface PendingComment {
  /** Tells drafts apart: a save only completes the draft it started from. */
  id: number;
  element: Element;
  anchor: ElementAnchor;
  /** Viewport coordinates of the click, used when `element` leaves the DOM before the comment is saved. */
  point: { x: number; y: number };
  /** The draft is being saved; until that ends it can neither move nor be discarded. */
  saving: boolean;
}

export interface CommentsNotice {
  type: 'success' | 'error';
  message: string;
}

export interface CommentsState {
  pageKey: string;
  /** Every comment, on every page; only the current page's get pins. */
  comments: Comment[];
  /** Comment mode: the page is not interactable and a click on it starts a comment. */
  active: boolean;
  panelMinimized: boolean;
  activeThreadId: string | null;
  /** Pin that should take focus once it is rendered: its thread was opened without a pointer. */
  focusPinId: string | null;
  pending: PendingComment | null;
  /** Comment the reader is being guided to. */
  guideId: string | null;
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
  /** Leaving comment mode drops any comment being written. */
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
  exportAll(): Promise<void>;
  importFile(file: File): Promise<void>;
  dismissNotice(): void;
}

export interface CommentsControllerOptions {
  /** Start in comment mode (the host loaded the layer because the user asked for it). */
  initialActive?: boolean;
}

const NOTICE_TIMEOUT_MS = 4000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const downloadJson = (filename: string, value: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

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

export const createCommentsController = (
  services: CommentsHostServices,
  { initialActive = false }: CommentsControllerOptions = {}
): CommentsController => {
  const { api, location } = services;
  const ignoreSelectors = services.ignoreSelectors ?? [];

  const store = createStore<CommentsState>({
    pageKey: location.getPageKey(),
    comments: [],
    active: initialActive,
    panelMinimized: false,
    activeThreadId: null,
    focusPinId: null,
    pending: null,
    guideId: null,
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
      const { active, guideId } = store.getState();
      return !active || guideId !== null;
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
    try {
      const comments = await api.list();
      if (!started || sequence !== loadSequence) {
        return;
      }
      if (writes !== writesBefore) {
        return load();
      }
      store.setState({ comments });
    } catch (error) {
      if (started && sequence === loadSequence) {
        notify(
          'error',
          i18n.translate('devComments.notice.loadFailed', {
            defaultMessage: 'Could not load comments: {message}',
            values: { message: errorMessage(error) },
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
    const { pageKey: previous, guideId, comments } = store.getState();
    if (pageKey === previous) {
      return;
    }
    // A guide survives the navigation it asked for (to the comment's page), nothing else.
    const guided = comments.find(({ id }) => id === guideId);
    store.setState({
      pageKey,
      pending: null,
      activeThreadId: null,
      focusPinId: null,
      guideId: guided?.route.pageKey === pageKey ? guideId : null,
    });
    void load();
  };

  const setActive = (active: boolean) =>
    store.setState({
      active,
      pending: null,
      activeThreadId: null,
      focusPinId: null,
      guideId: null,
      ...(active ? {} : { panelMinimized: false }),
    });

  const endGuide = (guideId: string) => {
    if (store.getState().guideId === guideId) {
      store.setState({ guideId: null });
    }
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
      const anchor = buildAnchor(element, { point, hit });
      store.setState({
        pending: { id: ++draftSequence, element, anchor, point, saving: false },
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
      // Everything describing the moment of commenting is taken now: the screenshot
      // and the request take time, during which the page may change or be left.
      const input: NewComment = {
        author: signAs(displayName),
        text: text.trim(),
        resolved: false,
        replies: [],
        route: { pageKey: location.getPageKey(), path: location.getPath() },
        anchor: draft.anchor,
        trail: trail.steps(),
      };
      const updateDraft = (changes: Partial<PendingComment>) =>
        store.setState((state) =>
          state.pending?.id === draft.id ? { pending: { ...state.pending, ...changes } } : {}
        );
      updateDraft({ saving: true });
      try {
        const { captureViewport } = services;
        const snapshot =
          attachScreenshot && captureViewport ? await createSnapshot(captureViewport) : undefined;
        const created = await api.create({ ...input, ...(snapshot ? { snapshot } : {}) });
        writes += 1;
        store.setState((state) => ({
          comments: [...state.comments, created],
          ...(state.pending?.id === draft.id
            ? { pending: null, activeThreadId: created.id, focusPinId: created.id }
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
      store.setState((state) => ({
        guideId: id,
        activeThreadId: null,
        focusPinId: null,
        ...droppingDraft(state),
      }));
      if (route.path === location.getPath()) {
        return;
      }
      if (!isSafeRelativePath(route.path)) {
        endGuide(id);
        notify(
          'error',
          i18n.translate('devComments.notice.unsafePath', {
            defaultMessage: 'The comment points at a page outside of this deployment.',
          })
        );
        return;
      }
      try {
        await services.navigateToPath(route.path);
      } catch (error) {
        endGuide(id);
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
      const { guideId } = store.getState();
      if (!guideId) {
        return;
      }
      store.setState({
        guideId: null,
        ...(found ? { activeThreadId: guideId, focusPinId: guideId } : {}),
      });
    },

    setOverlayOpen(open) {
      store.setState({ overlayOpen: open });
    },

    async exportAll() {
      try {
        const payload = await api.exportAll();
        downloadJson(`comments-${payload.exportedAt.slice(0, 10)}.json`, payload);
      } catch (error) {
        notify(
          'error',
          i18n.translate('devComments.notice.exportFailed', {
            defaultMessage: 'Export failed: {message}',
            values: { message: errorMessage(error) },
          })
        );
      }
    },

    async importFile(file) {
      try {
        const { imported, skipped, failed } = await api.importAll(JSON.parse(await file.text()));
        notify(
          imported === 0 && skipped + failed > 0 ? 'error' : 'success',
          i18n.translate('devComments.notice.imported', {
            defaultMessage:
              'Imported {imported, plural, one {# comment} other {# comments}}{skipped, plural, =0 {} other {, skipped # that this version cannot read}}{failed, plural, =0 {} other {, # could not be written}}.',
            values: { imported, skipped, failed },
          })
        );
        await load();
      } catch (error) {
        notify(
          'error',
          i18n.translate('devComments.notice.importFailed', {
            defaultMessage: 'Import failed: {message}',
            values: { message: errorMessage(error) },
          })
        );
      }
    },

    dismissNotice() {
      clearTimeout(noticeTimer);
      store.setState({ notice: null });
    },
  };
};
