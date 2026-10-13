/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState, type FunctionComponent } from 'react';
import { EuiScreenReaderLive } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Toast } from '@kbn/core-notifications-browser';

/**
 * Delay before announcing, so that focus restoration and layout changes triggered by
 * the same user action (e.g. a modal closing) settle and do not drop the announcement.
 */
export const TOAST_ANNOUNCEMENT_DELAY_MS = 500;

/**
 * Content hidden from the accessibility tree is never announced, including live regions,
 * and updates made while hidden are not replayed once it becomes visible again.
 */
const HIDDEN_ANCESTOR_SELECTOR = '[aria-hidden="true"], [inert]';

/**
 * While a modal is open, screen readers ignore everything outside it. This covers
 * `aria-modal` elements (EuiModal, EuiConfirmModal, overlay EuiFlyout, EuiPopover
 * with `ownFocus`) and native `<dialog>` elements opened with `showModal()`.
 */
const OPEN_MODAL_SELECTOR = '[aria-modal="true"]';
const OPEN_NATIVE_MODAL_SELECTOR = 'dialog:modal';

const OBSERVED_ATTRIBUTES = ['aria-modal', 'aria-hidden', 'inert', 'open'];

const hasOpenNativeModal = (): boolean => {
  try {
    return document.querySelector(OPEN_NATIVE_MODAL_SELECTOR) !== null;
  } catch {
    // `:modal` is not supported by every environment (e.g. older browsers, jsdom)
    return false;
  }
};

const isHiddenFromAssistiveTech = (element: HTMLElement | null): boolean =>
  element?.closest(HIDDEN_ANCESTOR_SELECTOR) != null ||
  document.querySelector(OPEN_MODAL_SELECTOR) !== null ||
  hasOpenNativeModal();

interface Announcement {
  id: string;
  message: string;
}

interface Props {
  /** Toasts to announce, keyed by the id of the toast that represents them in the list. */
  idToToasts: Record<string, Toast[]>;
  /** Returns the rendered text of a toast's mount point content, if any. */
  getMountedText: (toastId: string, part: 'title' | 'text') => string;
}

const getAnnouncementMessage = (color: Toast['color'], content: string): string => {
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
 * Announces newly added toasts to assistive technologies once nothing (e.g. an open modal)
 * hides the announcement from them.
 */
export const ToastAnnouncer: FunctionComponent<Props> = ({ idToToasts, getMountedText }) => {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const seenToastIds = useRef(new Set<string>());
  const announcerRef = useRef<HTMLDivElement>(null);
  const latestIdToToasts = useRef(idToToasts);
  latestIdToToasts.current = idToToasts;
  const latestGetMountedText = useRef(getMountedText);
  latestGetMountedText.current = getMountedText;

  useEffect(() => {
    const currentToastIds = new Set<string>();
    const idsWithNewToasts: string[] = [];

    Object.entries(idToToasts).forEach(([id, toasts]) => {
      let hasNewToast = false;
      toasts.forEach((toast) => {
        currentToastIds.add(toast.id);
        if (!seenToastIds.current.has(toast.id)) {
          hasNewToast = true;
        }
      });
      if (hasNewToast) {
        idsWithNewToasts.push(id);
      }
    });

    seenToastIds.current = currentToastIds;

    setPendingIds((prevIds) => {
      const nextIds = [...new Set([...prevIds, ...idsWithNewToasts])].filter(
        (id) => idToToasts[id] !== undefined
      );
      return nextIds.length === prevIds.length && nextIds.every((id, i) => id === prevIds[i])
        ? prevIds
        : nextIds;
    });
  }, [idToToasts]);

  useEffect(() => {
    if (!pendingIds.length) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let observer: MutationObserver | undefined;

    const announce = () => {
      const nextAnnouncements = pendingIds.flatMap((id): Announcement[] => {
        const toast = latestIdToToasts.current[id]?.[0];
        if (!toast) {
          return [];
        }

        const getText = (part: 'title' | 'text') => {
          const value = toast[part];
          return typeof value === 'string' ? value : latestGetMountedText.current(id, part);
        };
        const content = [getText('title'), getText('text')]
          .map((text) => text.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('. ');

        return content ? [{ id, message: getAnnouncementMessage(toast.color, content) }] : [];
      });

      setPendingIds([]);
      if (nextAnnouncements.length) {
        setAnnouncements(nextAnnouncements);
      }
    };

    const isHidden = () => isHiddenFromAssistiveTech(announcerRef.current);

    const waitUntilExposed = () => {
      observer = new MutationObserver(() => {
        if (isHidden()) {
          return;
        }
        observer?.disconnect();
        observer = undefined;
        scheduleAnnouncement();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: OBSERVED_ATTRIBUTES,
      });
    };

    const scheduleAnnouncement = () => {
      timeoutId = setTimeout(() => {
        if (isHidden()) {
          waitUntilExposed();
          return;
        }
        announce();
      }, TOAST_ANNOUNCEMENT_DELAY_MS);
    };

    scheduleAnnouncement();

    return () => {
      clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [pendingIds]);

  // Memoized so that re-renders of the toast list don't re-trigger the announcement
  const announcementContent = useMemo(
    () =>
      announcements.length ? (
        <>
          {announcements.map(({ id, message }) => (
            <p key={id}>{message}</p>
          ))}
        </>
      ) : null,
    [announcements]
  );

  return (
    <div ref={announcerRef}>
      <EuiScreenReaderLive>{announcementContent}</EuiScreenReaderLive>
    </div>
  );
};
