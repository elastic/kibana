/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiGlobalToastList, EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import React from 'react';
import { Observable, type Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';

import type { Toast } from '@kbn/core-notifications-browser';
import { MountWrapper } from '@kbn/core-mount-utils-browser-internal';
import { deduplicateToasts, ToastWithRichTitle } from './deduplicate_toasts';

interface Props {
  toasts$: Observable<Toast[]>;
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

export class GlobalToastList extends React.Component<Props, State> {
  public state: State = {
    toasts: [],
    idToToasts: {},
  };

  private subscription?: Subscription;

  public componentDidMount() {
    this.subscription = this.props.toasts$.subscribe((redundantToastList) => {
      const { toasts, idToToasts } = deduplicateToasts(redundantToastList);
      this.setState({ toasts, idToToasts });
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private closeToastsRepresentedById(id: string) {
    const representedToasts = this.state.idToToasts[id];
    if (representedToasts) {
      representedToasts.forEach((toast) => this.props.dismissToast(toast.id));
    }
  }

  public render() {
    return (
      <EuiGlobalToastList
        aria-label={i18n.translate('core.notifications.globalToast.ariaLabel', {
          defaultMessage: 'Notification message list',
        })}
        data-test-subj="globalToastList"
        toasts={this.state.toasts.map(convertToEui)}
        dismissToast={({ id }) => this.closeToastsRepresentedById(id)}
        /**
         * This prop is overridden by the individual toasts that are added.
         * Use `Infinity` here so that it's obvious a timeout hasn't been
         * provided in development.
         */
        toastLifeTimeMs={Infinity}
      />
    );
  }
}
