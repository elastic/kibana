/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiGlobalToastList, EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import React, { useEffect, useState, type FunctionComponent, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';

import type { Toast } from '@kbn/core-notifications-browser';
import { MountWrapper } from '@kbn/core-mount-utils-browser-internal';
import { deduplicateToasts, ToastWithRichTitle } from './deduplicate_toasts';
import { EventReporter } from './telemetry';

interface Props {
  toasts$: Observable<Toast[]>;
  reportEvent: EventReporter;
  dismissToast: (toastId: string) => void;
}

interface State {
  toasts: ToastWithRichTitle[];
  idToToasts: Record<string, Toast[]>;
}

const convertToEui = (toast: ToastWithRichTitle): EuiToast => ({
  ...toast,
  title: toast.title instanceof Function ? <MountWrapper mount={toast.title} /> : toast.title,
  text: toast.text instanceof Function ? <MountWrapper mount={toast.text} /> : toast.text,
});

export const GlobalToastList: FunctionComponent<Props> = ({
  toasts$,
  dismissToast,
  reportEvent,
}) => {
  const [toasts, setToasts] = useState<State['toasts']>([]);
  const [idToToasts, setIdToToasts] = useState<State['idToToasts']>({});

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
    <EuiGlobalToastList
      aria-label={i18n.translate('core.notifications.globalToast.ariaLabel', {
        defaultMessage: 'Notification message list',
      })}
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
  );
};
