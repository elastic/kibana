/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiGlobalToastList, EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import React from 'react';
import * as Rx from 'rxjs';
import { i18n } from '@kbn/i18n';

import { MountWrapper } from '../../utils';
import { Toast } from './toasts_api';

interface Props {
  toasts$: Rx.Observable<Toast[]>;
  dismissToast: (toastId: string) => void;
}

interface State {
  toasts: Toast[];
}

const convertToEui = (toast: Toast): EuiToast => ({
  ...toast,
  title: typeof toast.title === 'function' ? <MountWrapper mount={toast.title} /> : toast.title,
  text: typeof toast.text === 'function' ? <MountWrapper mount={toast.text} /> : toast.text,
});

export class GlobalToastList extends React.Component<Props, State> {
  public state: State = {
    toasts: [],
  };

  private subscription?: Rx.Subscription;

  public componentDidMount() {
    this.subscription = this.props.toasts$.subscribe((toasts) => {
      this.setState({ toasts });
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
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
        dismissToast={({ id }) => this.props.dismissToast(id)}
        /**
         * This prop is overriden by the individual toasts that are added.
         * Use `Infinity` here so that it's obvious a timeout hasn't been
         * provided in development.
         */
        toastLifeTimeMs={Infinity}
      />
    );
  }
}
