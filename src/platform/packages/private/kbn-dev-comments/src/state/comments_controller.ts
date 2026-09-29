/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DISPLAY_NAME_STORAGE_KEY, GUIDE_HANDOFF_STORAGE_KEY, TRAIL_MAX_STEPS } from '../constants';
import { buildAnchor, isIgnored, isInTooltip, isVisible } from '../lib/anchor';
import { isPassingThrough } from '../lib/pass_through';
import { createSnapshot } from '../lib/snapshot';
import { createTrailRecorder, hoverStepFor } from '../lib/trail';
import type {
  Comment,
  CommentAuthor,
  CommentRoute,
  CommentsHostServices,
  CommentsUser,
  ElementAnchor,
  NewComment,
  NewSnapshot,
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
  /** The screenshot, when taken as the comment was started (what it is about, a tooltip, may not last until the save), or what went wrong. */
  snapshot?: Promise<NewSnapshot | ScreenshotError>;
  /** The draft is being saved; until that ends it can neither move nor be discarded. */
  saving: boolean;
}

export interface PickOptions {
  /** The element whose hovering shows the picked one (a tooltip's trigger): the hover ends the trail, and the screenshot is taken right away. */
  revealedBy?: Element;
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
  /** A fetch of the list is in flight. */
  loading: boolean;
  /** When the list was last fetched (ISO): what every comment shown is as of. */
  loadedAt: string | null;
  /** When a comment was last fetched on its own (ISO), by id, since the list was; see `refresh`. */
  refreshedAt: Record<string, string>;
  /** Comments being fetched on their own. */
  refreshingIds: ReadonlySet<string>;
  /** Why the list could not be fetched the last time, until it is fetched again. */
  loadError: string | null;
  /** Comment mode: the page is not interactable and a click on it starts a comment. */
  active: boolean;
  panelMinimized: boolean;
  /** The thread the panel shows in place of the list: the fallback for a comment whose element cannot be shown. */
  panelThreadId: string | null;
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
  /** Fetches the comments again; drafts and the open thread are kept. */
  reload(): Promise<void>;
  /** Fetches one comment again, on its own; a comment that is gone is taken off the list. */
  refresh(id: string): Promise<void>;
  /** Leaving comment mode drops any comment being written; while one is being saved, the mode cannot be changed. */
  setActive(active: boolean): void;
  toggleActive(): void;
  setPanelMinimized(minimized: boolean): void;
  /** Starts (or moves) a comment on `element`; `hit` is the innermost element under the pointer, which the pin follows. Ignored while a draft is being saved. */
  pick(
    element: Element,
    point: { x: number; y: number },
    hit?: Element,
    options?: PickOptions
  ): void;
  cancelPending(): void;
  /** `displayName` signs this and future comments. A failure, a screenshot that could not be taken included, is reported and hands the draft back. */
  save(text: string, options: { attachScreenshot: boolean; displayName: string }): Promise<void>;
  reply(id: string, text: string, displayName: string): Promise<void>;
  setResolved(id: string, resolved: boolean): Promise<void>;
  setDraft(id: string, text: string): void;
  /** With `focusPin`, the thread's pin takes focus once rendered. */
  openThread(id: string | null, options?: { focusPin?: boolean }): void;
  /** Called by a pin once it took the focus requested through `focusPinId`. */
  pinFocused(id: string): void;
  /** Opens the page the comment was made on and guides the reader through the author's clicks; a page the host loads anew (another space's) goes on with the guide. */
  guideTo(comment: Comment): Promise<void>;
  /** Ends the guide; with `found`, opens the comment at its pin, which takes focus unless `focusPin` is false (a tooltip shown for its element's focus would go). */
  stopGuide(found?: boolean, options?: { focusPin?: boolean }): void;
  /** Shows the thread in the panel, in place of the list, ending any guide; `null` goes back to the list. */
  showInPanel(id: string | null): void;
  setOverlayOpen(open: boolean): void;
  dismissNotice(): void;
}

const NOTICE_TIMEOUT_MS = 4000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Web storage can be disabled or full (private browsing): what it cannot keep is not kept. */
const withStorage = <T>(action: () => T, fallback: T): T => {
  try {
    return action();
  } catch {
    return fallback;
  }
};

const readStoredDisplayName = (): string =>
  withStorage(() => localStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? '', '');

const storeDisplayName = (displayName: string) =>
  withStorage(() => localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName), undefined);

/** A guide running as the page was left, for the layer of the page loaded next to go on with (the host loads another space's page anew). */
interface GuideHandoff {
  id: string;
  /** The comment's page; the guide goes on only if that is the page loaded. */
  pageKey: string;
  /** When the page was left (epoch ms). */
  at: number;
}

/** How long the page gets to load before a handoff lapses; a development server takes its time. */
export const GUIDE_HANDOFF_TTL_MS = 60_000;

// In session storage: this tab's alone, where the page load happens.
const storeGuideHandoff = (handoff: GuideHandoff) =>
  withStorage(
    () => sessionStorage.setItem(GUIDE_HANDOFF_STORAGE_KEY, JSON.stringify(handoff)),
    undefined
  );

/** The handoff left by the page before, if any, taken off: it is for this one page load. */
const takeGuideHandoff = (): GuideHandoff | null =>
  withStorage(() => {
    const stored = sessionStorage.getItem(GUIDE_HANDOFF_STORAGE_KEY);
    sessionStorage.removeItem(GUIDE_HANDOFF_STORAGE_KEY);
    const handoff = stored ? (JSON.parse(stored) as Partial<GuideHandoff>) : null;
    return typeof handoff?.id === 'string' &&
      typeof handoff.pageKey === 'string' &&
      typeof handoff.at === 'number'
      ? (handoff as GuideHandoff)
      : null;
  }, null);

/** Drops the draft, unless it is being saved: a save cannot be discarded. */
const droppingDraft = (state: CommentsState): Partial<CommentsState> =>
  state.pending?.saving ? {} : { pending: null };

/** Opens the thread at its pin; one shown in the panel gives way: one thread at a time. */
const openingPin = (id: string, focusPin: boolean): Partial<CommentsState> => ({
  activeThreadId: id,
  focusPinId: focusPin ? id : null,
  panelThreadId: null,
});

/** Shows the thread in the panel, expanded, in place of the list; one open at its pin gives way. */
const showingInPanel = (id: string): Partial<CommentsState> => ({
  panelThreadId: id,
  panelMinimized: false,
  activeThreadId: null,
  focusPinId: null,
});

/** Opens the new comment's thread at its pin, or in the panel when its tooltip, and so the pin, has gone. */
const openingNew = (id: string, element: Element): Partial<CommentsState> =>
  isInTooltip(element) && !(element.isConnected && isVisible(element))
    ? showingInPanel(id)
    : openingPin(id, true);

/** A screenshot that was asked for could not be taken; the comment is not saved without it. */
export class ScreenshotError extends Error {}

export const createCommentsController = (services: CommentsHostServices): CommentsController => {
  const { api, location } = services;
  const ignoreSelectors = services.ignoreSelectors ?? [];

  // The screenshot is of the page the comment was picked on: that is checked
  // before the capture and, as it takes a while, after it too.
  const takeScreenshot = async (
    draft: PendingComment,
    captureViewport: () => Promise<HTMLCanvasElement>
  ): Promise<NewSnapshot> => {
    const checkPage = () => {
      if (location.getPath() !== draft.route.path) {
        throw new ScreenshotError(
          i18n.translate('devComments.snapshot.pageChanged', {
            defaultMessage: 'The page has changed since the comment was started',
          })
        );
      }
    };
    checkPage();
    let snapshot: NewSnapshot;
    try {
      snapshot = await createSnapshot(captureViewport);
    } catch (error) {
      throw new ScreenshotError(errorMessage(error));
    }
    checkPage();
    return snapshot;
  };

  const store = createStore<CommentsState>({
    pageKey: location.getPageKey(),
    comments: [],
    loaded: false,
    loading: false,
    loadedAt: null,
    refreshedAt: {},
    refreshingIds: new Set(),
    loadError: null,
    active: false,
    panelMinimized: true,
    panelThreadId: null,
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
    // In comment mode, page clicks place pins instead of acting: except during a guide, or with Alt held.
    isRecording: () => {
      const { active, guide } = store.getState();
      return !active || guide !== null || isPassingThrough();
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

  const toggled = (ids: ReadonlySet<string>, id: string, member: boolean): ReadonlySet<string> => {
    const next = new Set(ids);
    if (member) {
      next.add(id);
    } else {
      next.delete(id);
    }
    return next;
  };

  const setBusy = (id: string, busy: boolean) =>
    store.setState(({ busyIds }) => ({ busyIds: toggled(busyIds, id, busy) }));

  const setRefreshing = (id: string, refreshing: boolean) =>
    store.setState(({ refreshingIds }) => ({
      refreshingIds: toggled(refreshingIds, id, refreshing),
    }));

  // Fetches the list; nothing else (drafts, the open thread) is touched, so a refresh is safe at any time.
  const load = async (): Promise<void> => {
    const sequence = ++loadSequence;
    const writesBefore = writes;
    store.setState({ loading: true, loadError: null });
    try {
      const comments = await api.list();
      if (!started || sequence !== loadSequence) {
        return;
      }
      if (writes !== writesBefore) {
        return load();
      }
      store.setState({
        comments,
        loaded: true,
        loading: false,
        loadedAt: new Date().toISOString(),
        refreshedAt: {},
      });
    } catch (error) {
      if (started && sequence === loadSequence) {
        const message = errorMessage(error);
        store.setState({ loading: false, loadError: message });
        notify(
          'error',
          i18n.translate('devComments.notice.loadFailed', {
            defaultMessage: 'Could not load comments - {message}',
            values: { message },
          })
        );
      }
    }
  };

  // Fetches one comment, for its thread: replies made elsewhere show up without the
  // whole list being fetched. Like `load`, a fetch a write completed under is made again.
  const refresh = async (id: string): Promise<void> => {
    if (store.getState().refreshingIds.has(id)) {
      return;
    }
    setRefreshing(id, true);
    try {
      let updated: Comment | undefined;
      let writesBefore: number;
      do {
        writesBefore = writes;
        updated = await api.get(id);
      } while (started && writes !== writesBefore);
      if (!started) {
        return;
      }
      if (updated) {
        store.setState(({ comments, refreshedAt }) => ({
          comments: comments.map((comment) => (comment.id === id ? updated : comment)),
          refreshedAt: { ...refreshedAt, [id]: new Date().toISOString() },
        }));
        return;
      }
      // Gone from the store: so is the thread, whichever way it was shown.
      store.setState(({ comments, activeThreadId, panelThreadId }) => ({
        comments: comments.filter((comment) => comment.id !== id),
        ...(activeThreadId === id ? { activeThreadId: null } : {}),
        ...(panelThreadId === id ? { panelThreadId: null } : {}),
      }));
      notify(
        'error',
        i18n.translate('devComments.notice.commentGone', {
          defaultMessage: 'The comment no longer exists.',
        })
      );
    } catch (error) {
      notify(
        'error',
        i18n.translate('devComments.notice.refreshFailed', {
          defaultMessage: 'Could not refresh the thread - {message}',
          values: { message: errorMessage(error) },
        })
      );
    } finally {
      setRefreshing(id, false);
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
    // Only a guide survives the navigation it asked for; a draft being saved is
    // kept until the save settles, to be handed back should it fail.
    const guided = guide && comments.find(({ id }) => id === guide.id);
    store.setState((state) => ({
      pageKey,
      activeThreadId: null,
      focusPinId: null,
      panelThreadId: null,
      guide: guided?.route.pageKey === pageKey ? guide : null,
      ...droppingDraft(state),
    }));
    void load();
  };

  // The guide outlives the page: the host loads another space's page anew, and a reload should not lose it either.
  const onPageHide = () => {
    const { guide, comments } = store.getState();
    const comment = guide && comments.find(({ id }) => id === guide.id);
    if (comment) {
      storeGuideHandoff({ id: guide.id, pageKey: comment.route.pageKey, at: Date.now() });
    }
  };

  // ...and goes on, in comment mode, if the page loaded is the comment's, soon enough.
  const resumeGuide = () => {
    const handoff = takeGuideHandoff();
    if (
      handoff &&
      Date.now() - handoff.at <= GUIDE_HANDOFF_TTL_MS &&
      handoff.pageKey === location.getPageKey()
    ) {
      store.setState({ active: true, guide: { id: handoff.id, navigating: false } });
    }
  };

  // A draft being saved is dropped by no way out of comment mode: the mode waits.
  // The panel starts out minimized each time; the list is a click away.
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
      panelThreadId: null,
      ...(active ? {} : { panelMinimized: true }),
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
      window.addEventListener('pagehide', onPageHide);
      trail.start();
      resumeGuide();
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
      window.removeEventListener('pagehide', onPageHide);
      trail.stop();
      clearTimeout(noticeTimer);
    },

    reload: load,

    refresh,

    setActive,

    toggleActive() {
      setActive(!store.getState().active);
    },

    setPanelMinimized(minimized) {
      store.setState({ panelMinimized: minimized });
    },

    pick(element, point, hit, { revealedBy } = {}) {
      if (store.getState().pending?.saving) {
        return;
      }
      // The draft is the moment of commenting: the element, its page, and the
      // clicks that led there, the last of which may be the hover that revealed it.
      const hoverStep =
        revealedBy && !isIgnored(revealedBy, ignoreSelectors) ? [hoverStepFor(revealedBy)] : [];
      const draft: PendingComment = {
        id: ++draftSequence,
        element,
        anchor: buildAnchor(element, { point, hit }),
        point,
        route: { pageKey: location.getPageKey(), path: location.getPath() },
        trail: [...trail.steps(), ...hoverStep].slice(-TRAIL_MAX_STEPS),
        saving: false,
      };
      const { captureViewport } = services;
      // What shows on hover is gone once the pointer leaves for the composer.
      if ((revealedBy || isInTooltip(element)) && captureViewport) {
        draft.snapshot = takeScreenshot(draft, captureViewport).catch(
          (error): ScreenshotError =>
            error instanceof ScreenshotError ? error : new ScreenshotError(errorMessage(error))
        );
      }
      store.setState({ pending: draft, activeThreadId: null, focusPinId: null });
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
        const snapshot =
          attachScreenshot && captureViewport
            ? await (draft.snapshot ?? takeScreenshot(draft, captureViewport))
            : undefined;
        if (snapshot instanceof ScreenshotError) {
          throw snapshot;
        }
        const created = await api.create({ ...input, ...(snapshot ? { snapshot } : {}) });
        writes += 1;
        // The new comment opens, unless the page changed under the save: its pin
        // is on the page it was made on.
        store.setState((state) => ({
          comments: [...state.comments, created],
          ...(state.pending?.id === draft.id ? { pending: null } : {}),
          ...(state.pending?.id === draft.id && state.pageKey === draft.route.pageKey
            ? openingNew(created.id, draft.element)
            : {}),
        }));
      } catch (error) {
        notify(
          'error',
          error instanceof ScreenshotError
            ? i18n.translate('devComments.notice.screenshotFailed', {
                defaultMessage:
                  'Could not take the screenshot - {message}. Turn off "Attach screenshot" to post without one.',
                values: { message: error.message },
              })
            : i18n.translate('devComments.notice.saveFailed', {
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
            defaultMessage: 'Could not update the comment - {message}',
            values: { message },
          })
      );
    },

    setDraft(id, text) {
      store.setState(({ drafts }) => ({ drafts: { ...drafts, [id]: text } }));
    },

    openThread(id, { focusPin = false } = {}) {
      store.setState((state) =>
        id
          ? { ...openingPin(id, focusPin), ...droppingDraft(state) }
          : { activeThreadId: null, focusPinId: null }
      );
    },

    pinFocused(id) {
      if (store.getState().focusPinId === id) {
        store.setState({ focusPinId: null });
      }
    },

    async guideTo(comment) {
      const { id, route } = comment;
      // Not until the host has opened the comment's page is it looked at: the
      // current one may be the same page in another state, element and all.
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
      // Stopped or started over meanwhile, the guide is no longer this one's to go on with, or to report on.
      const current = () => store.getState().guide === guide;
      try {
        await services.navigateToPath(route.path);
        if (current()) {
          store.setState({ guide: { id, navigating: false } });
        }
      } catch (error) {
        if (!current()) {
          return;
        }
        store.setState({ guide: null });
        notify(
          'error',
          i18n.translate('devComments.notice.navigateFailed', {
            defaultMessage: 'Could not open the page of the comment - {message}',
            values: { message: errorMessage(error) },
          })
        );
      }
    },

    stopGuide(found = false, { focusPin = true } = {}) {
      const { guide } = store.getState();
      if (!guide) {
        return;
      }
      store.setState({
        guide: null,
        ...(found ? openingPin(guide.id, focusPin) : {}),
      });
    },

    showInPanel(id) {
      store.setState((state) => ({
        guide: null,
        ...(id ? { ...showingInPanel(id), ...droppingDraft(state) } : { panelThreadId: null }),
      }));
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
