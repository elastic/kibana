/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiGlobalToastList, EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import React, { useEffect, useState, type FunctionComponent } from 'react';
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

  useEffect(() => {
    const { unsubscribe } = toasts$.subscribe((redundantToastList) => {
      const { toasts: reducedToasts, idToToasts: reducedIdToasts } =
        deduplicateToasts(redundantToastList);
      setIdToToasts(reducedIdToasts);
      setToasts(reducedToasts);
    });

    return unsubscribe;
  }, [toasts$]);

  const closeToastsRepresentedById = (id: string) => {
    const representedToasts = idToToasts[id];
    if (representedToasts) {
      representedToasts.forEach((toast) => dismissToast(toast.id));

      if (representedToasts.length > 1) {
        reportEvent.onDismissToast({
          recurrenceCount: representedToasts.length,
          toastMessage: representedToasts[0].title!,
        });
      }
    }
  };

  return (
    <EuiGlobalToastList
      aria-label={i18n.translate('core.notifications.globalToast.ariaLabel', {
        defaultMessage: 'Notification message list',
      })}
      data-test-subj="globalToastList"
      toasts={toasts.map(convertToEui)}
      dismissToast={({ id }) => closeToastsRepresentedById(id)}
      /**
       * This prop is overridden by the individual toasts that are added.
       * Use `Infinity` here so that it's obvious a timeout hasn't been
       * provided in development.
       */
      toastLifeTimeMs={Infinity}
    />
  );
};
