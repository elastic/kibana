/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { useComments, useCommentsState } from './comments_context';
import { CommentModeOverlay } from './comment_mode_overlay';
import { CommentsPanel } from './comments_panel';
import { ComposerPopover } from './composer_popover';
import { GuideOverlay } from './guide_overlay';
import { NoticeToast } from './notice_toast';
import { PinsLayer } from './pins_layer';
import { ResolvedAnchorsProvider } from './resolved_anchors';

/** `⌘⇧K` / `Ctrl+Shift+K` */
export const isToggleShortcut = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k';

export const CommentsLayer = () => {
  const controller = useComments();
  const active = useCommentsState((state) => state.active);
  const pending = useCommentsState((state) => state.pending);
  const overlayOpen = useCommentsState((state) => state.overlayOpen);
  const notice = useCommentsState((state) => state.notice);
  const guided = useCommentsState((state) =>
    state.guideId ? state.comments.find(({ id }) => id === state.guideId) ?? null : null
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isToggleShortcut(event)) {
        event.preventDefault();
        controller.toggleActive();
        return;
      }
      if (event.key !== 'Escape') {
        return;
      }
      const state = controller.store.getState();
      if (!state.active || state.overlayOpen) {
        return;
      }
      if (state.pending) {
        // A draft being saved cannot be discarded; Escape waits for the save.
        if (!state.pending.saving) {
          controller.cancelPending();
        }
      } else if (state.guideId) {
        controller.stopGuide();
      } else if (state.activeThreadId) {
        controller.openThread(null);
      } else {
        controller.setActive(false);
      }
      // The page's flyouts and popovers keep their state.
      event.stopPropagation();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [controller]);

  // Comment mode takes the keyboard over; on leaving it, focus returns to where it was.
  useEffect(() => {
    if (!active) {
      return;
    }
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [active]);

  if (!active) {
    return notice ? <NoticeToast notice={notice} /> : null;
  }

  // The guide needs the page to be interactable again while it runs.
  return (
    <ResolvedAnchorsProvider>
      {!guided && !overlayOpen && <CommentModeOverlay />}
      <PinsLayer />
      {pending && <ComposerPopover pending={pending} />}
      {!guided && <CommentsPanel />}
      {guided && <GuideOverlay comment={guided} />}
      {notice && <NoticeToast notice={notice} />}
    </ResolvedAnchorsProvider>
  );
};
