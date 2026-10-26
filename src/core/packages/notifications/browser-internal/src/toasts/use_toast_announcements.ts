/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { Toast } from '@kbn/core-notifications-browser';
import type { InternalScreenReaderStart } from '../screen_reader';

export type ToastContentPart = 'title' | 'text';

export type GetMountedText = (toastId: string, part: ToastContentPart) => string;

interface Options {
  /** Toasts grouped by the id of the toast that represents them in the list. */
  idToToasts: Record<string, Toast[]>;
  /** Returns the rendered text of a toast's mount point title or text. */
  getMountedText: GetMountedText;
  notifyScreenReader: InternalScreenReaderStart['notify'];
}

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
 * Announces new toasts to screen readers, e.g. "Success: Rule exported".
 */
export const useToastAnnouncements = ({
  idToToasts,
  getMountedText,
  notifyScreenReader,
}: Options): void => {
  const seenToastIds = useRef(new Set<string>());
  const latestIdToToasts = useRef(idToToasts);

  useEffect(() => {
    latestIdToToasts.current = idToToasts;

    // A group is announced when any of its toasts is new, so repeated toasts are announced again
    const isNew = ({ id }: Toast) => !seenToastIds.current.has(id);
    Object.entries(idToToasts).forEach(([id, toasts]) => {
      if (!toasts.some(isNew)) {
        return;
      }
      // Resolved when the announcement batch closes: by then mount point content has rendered,
      // and toasts dismissed in the meantime are skipped. Assertive, because the action that shows
      // a toast often also moves focus, and a polite announcement would be lost in its readout.
      notifyScreenReader(
        () => {
          const toast = latestIdToToasts.current[id]?.[0];
          if (!toast) {
            return '';
          }
          const content = getToastContent(id, toast, getMountedText);
          return content && withToastType(toast.color, content);
        },
        { politeness: 'assertive' }
      );
    });

    seenToastIds.current = new Set(
      Object.values(idToToasts).flatMap((toasts) => toasts.map(({ id }) => id))
    );
  }, [idToToasts, getMountedText, notifyScreenReader]);
};
