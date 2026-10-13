/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import { EuiGlobalToastList } from '@elastic/eui';
import React, { useEffect, useState, type FunctionComponent, useCallback, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';

import type { Toast } from '@kbn/core-notifications-browser';
import { MountWrapper } from '@kbn/core-mount-utils-browser-internal';
import type { ToastWithRichTitle } from './deduplicate_toasts';
import { deduplicateToasts } from './deduplicate_toasts';
import type { ToastsTelemetry } from './telemetry';
import { ToastAnnouncer } from './toast_announcer';

interface Props {
  toasts$: Observable<Toast[]>;
  reportEvent: ReturnType<ToastsTelemetry['start']>;
  dismissToast: (toastId: string) => void;
}

interface State {
  toasts: ToastWithRichTitle[];
  idToToasts: Record<string, Toast[]>;
}

type ToastContentPart = 'title' | 'text';

const getContentNodeKey = (toastId: string, part: ToastContentPart) => `${toastId}:${part}`;

export const GlobalToastList: FunctionComponent<Props> = ({
  toasts$,
  dismissToast,
  reportEvent,
}) => {
  const [toasts, setToasts] = useState<State['toasts']>([]);
  const [idToToasts, setIdToToasts] = useState<State['idToToasts']>({});
  const contentNodes = useRef(new Map<string, HTMLElement>());

  const renderContent = (
    toastId: string,
    part: ToastContentPart,
    content: ToastWithRichTitle[ToastContentPart]
  ) => {
    if (!(content instanceof Function)) {
      return content;
    }
    const key = getContentNodeKey(toastId, part);
    return (
      <span
        ref={(node) => {
          if (node) {
            contentNodes.current.set(key, node);
          } else {
            contentNodes.current.delete(key);
          }
        }}
      >
        <MountWrapper mount={content} />
      </span>
    );
  };

  const convertToEui = (toast: ToastWithRichTitle): EuiToast => ({
    ...toast,
    title: renderContent(toast.id, 'title', toast.title),
    text: renderContent(toast.id, 'text', toast.text),
  });

  const getMountedText = useCallback(
    (toastId: string, part: ToastContentPart) =>
      contentNodes.current.get(getContentNodeKey(toastId, part))?.textContent ?? '',
    []
  );

  const reportToastDismissal = useCallback(
    (representedToasts: State['idToToasts'][number]) => {
      // Select the first duplicate toast within the represented toast group
      // given it's identical to all other recurring ones within it's group
      const firstDuplicateToast = representedToasts[0];

      if (
        representedToasts.length > 1 &&
        firstDuplicateToast.color !== 'success' &&
        firstDuplicateToast.title
      ) {
        reportEvent.onDismissToast({
          toastMessage:
            firstDuplicateToast.title instanceof Function
              ? renderToStaticMarkup(<MountWrapper mount={firstDuplicateToast.title} />)
              : firstDuplicateToast.title,
          recurrenceCount: representedToasts.length,
          toastMessageType: firstDuplicateToast.color,
        });
      }
    },
    [reportEvent]
  );

  useEffect(() => {
    const subscription = toasts$.subscribe((redundantToastList) => {
      const { toasts: reducedToasts, idToToasts: reducedIdToasts } =
        deduplicateToasts(redundantToastList);

      setIdToToasts(reducedIdToasts);
      setToasts(reducedToasts);
    });

    return () => subscription.unsubscribe();
  }, [reportEvent, toasts$]);

  const closeToastsRepresentedById = useCallback(
    ({ id }: EuiToast) => {
      const representedToasts = idToToasts[id];

      if (representedToasts) {
        representedToasts.forEach((toast) => dismissToast(toast.id));

        reportToastDismissal(representedToasts);
      }
    },
    [dismissToast, idToToasts, reportToastDismissal]
  );

  return (
    <>
      <EuiGlobalToastList
        aria-label={i18n.translate('core.notifications.globalToast.ariaLabel', {
          defaultMessage: 'Notification message list',
        })}
        /**
         * Announcements are handled by `ToastAnnouncer`, which waits for open modals to close
         * so that toasts added while a modal is open are not lost to screen readers.
         */
        aria-live="off"
        data-test-subj="globalToastList"
        toasts={toasts.map(convertToEui)}
        dismissToast={closeToastsRepresentedById}
        /**
         * This prop is overridden by the individual toasts that are added.
         * Use `Infinity` here so that it's obvious a timeout hasn't been
         * provided in development.
         */
        toastLifeTimeMs={Infinity}
      />
      <ToastAnnouncer idToToasts={idToToasts} getMountedText={getMountedText} />
    </>
  );
};
