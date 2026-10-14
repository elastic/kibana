/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState, type FunctionComponent } from 'react';
import { EuiLiveAnnouncer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Toast } from '@kbn/core-notifications-browser';

/**
 * Delay before announcing, and between checks while the announcer is hidden. It lets focus
 * restoration and layout changes caused by the same action (e.g. a modal closing) settle,
 * so they don't cut the announcement off.
 */
export const TOAST_ANNOUNCEMENT_DELAY_MS = 500;

export type ToastContentPart = 'title' | 'text';

export type GetMountedText = (toastId: string, part: ToastContentPart) => string;

interface Props {
  /** Toasts grouped by the id of the toast that represents them in the list. */
  idToToasts: Record<string, Toast[]>;
  /** Returns the rendered text of a toast's mount point title or text. */
  getMountedText: GetMountedText;
}

interface Announcement {
  /** Unique per announcement, so that repeating a message inserts a new node that is announced. */
  key: string;
  message: string;
}

const hasOpenNativeModal = (): boolean => {
  try {
    return document.querySelector('dialog:modal') !== null;
  } catch {
    // jsdom doesn't support `:modal`
    return false;
  }
};

/**
 * Screen readers ignore content hidden from the accessibility tree, live regions included,
 * and don't replay updates made while it was hidden. The announcer is hidden when:
 * - an ancestor has `aria-hidden="true"` or `inert`, e.g. set by a focus trap isolating its content
 * - a modal is open: EuiModal, EuiConfirmModal, overlay EuiFlyout and EuiPopover with `ownFocus`
 *   set `aria-modal="true"`, and native `<dialog>`s opened with `showModal()` match `:modal`
 */
const isHiddenFromAssistiveTech = (announcer: HTMLElement | null): boolean =>
  Boolean(announcer?.closest('[aria-hidden="true"], [inert]')) ||
  document.querySelector('[aria-modal="true"]') !== null ||
  hasOpenNativeModal();

/** Returns the toast's title and text as a single line of plain text. */
const getToastContent = (id: string, toast: Toast, getMountedText: GetMountedText): string =>
  (['title', 'text'] as const)
    .map((part) => {
      const value = toast[part];
      return typeof value === 'function' ? getMountedText(id, part) : value ?? '';
    })
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('. ');

const withToastType = (color: Toast['color'], content: string): string => {
  switch (color) {
    case 'success':
      return i18n.translate('core.notifications.globalToast.announcement.success', {
        defaultMessage: 'Success: {content}',
        values: { content },
      });
    case 'warning':
      return i18n.translate('core.notifications.globalToast.announcement.warning', {
        defaultMessage: 'Warning: {content}',
        values: { content },
      });
    case 'danger':
      return i18n.translate('core.notifications.globalToast.announcement.danger', {
        defaultMessage: 'Error: {content}',
        values: { content },
      });
    default:
      return i18n.translate('core.notifications.globalToast.announcement.info', {
        defaultMessage: 'Notification: {content}',
        values: { content },
      });
  }
};

/**
 * Announces new toasts to screen readers. Unlike the live region of EuiGlobalToastList, it
 * waits until nothing (e.g. an open modal) hides it, so toasts added meanwhile are not lost.
 */
export const ToastAnnouncer: FunctionComponent<Props> = ({ idToToasts, getMountedText }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const announcerRef = useRef<HTMLDivElement>(null);
  const seenToastIds = useRef(new Set<string>());
  const pendingIds = useRef(new Set<string>());
  const announcementCount = useRef(0);

  useEffect(() => {
    // A group is pending when any of its toasts is new, so repeated toasts are announced again
    const isNew = ({ id }: Toast) => !seenToastIds.current.has(id);
    Object.entries(idToToasts).forEach(([id, toasts]) => {
      if (toasts.some(isNew)) {
        pendingIds.current.add(id);
      }
    });
    seenToastIds.current = new Set(
      Object.values(idToToasts).flatMap((toasts) => toasts.map(({ id }) => id))
    );

    if (!pendingIds.current.size) {
      return;
    }

    const announce = () => {
      const batch = ++announcementCount.current;
      const nextAnnouncements = [...pendingIds.current].flatMap((id): Announcement[] => {
        // Toasts dismissed before they could be announced are skipped
        const toast = idToToasts[id]?.[0];
        if (!toast) {
          return [];
        }
        const content = getToastContent(id, toast, getMountedText);
        return content
          ? [{ key: `${batch}:${id}`, message: withToastType(toast.color, content) }]
          : [];
      });

      pendingIds.current.clear();
      if (nextAnnouncements.length) {
        setAnnouncements(nextAnnouncements);
      }
    };

    // Announce once the announcer has been exposed to assistive technologies for a full delay
    let timeoutId: ReturnType<typeof setTimeout>;
    let wasHidden = false;
    const announceWhenExposed = () => {
      timeoutId = setTimeout(() => {
        const isHidden = isHiddenFromAssistiveTech(announcerRef.current);
        if (isHidden || wasHidden) {
          wasHidden = isHidden;
          announceWhenExposed();
        } else {
          announce();
        }
      }, TOAST_ANNOUNCEMENT_DELAY_MS);
    };
    announceWhenExposed();

    return () => clearTimeout(timeoutId);
  }, [idToToasts, getMountedText]);

  // Memoized so that re-renders of the toast list don't restart EuiLiveAnnouncer's clear timer
  const content = useMemo(
    () =>
      announcements.length ? (
        <>
          {announcements.map(({ key, message }) => (
            <p key={key}>{message}</p>
          ))}
        </>
      ) : null,
    [announcements]
  );

  // EuiLiveAnnouncer keeps one region that is always live and only changes its content.
  // EuiScreenReaderLive instead un-hides and enables a second region in the same update that
  // inserts the content, which VoiceOver in particular does not reliably announce.
  return (
    <div ref={announcerRef}>
      <EuiLiveAnnouncer data-test-subj="globalToastListAnnouncer">{content}</EuiLiveAnnouncer>
    </div>
  );
};
