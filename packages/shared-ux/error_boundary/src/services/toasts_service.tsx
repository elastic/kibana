/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiGlobalToastList, EuiGlobalToastListProps } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import * as Rx from 'rxjs';
import { ErrorBoundaryUIServices } from '../../types';
import {
  FatalToastText,
  FatalToastTitle,
  RecoverableToastText,
  RecoverableToastTitle,
} from '../ui/error_messages';

export class ToastsService {
  private _toasts = new Rx.BehaviorSubject<EuiGlobalToastListProps['toasts']>([]);

  constructor(private services: ErrorBoundaryUIServices) {}

  public get toasts$() {
    return this._toasts.asObservable();
  }

  public addError(_error: Error, isFatal: boolean) {
    if (isFatal) {
      this._toasts.next([
        {
          id: 'fatal-123', // FIXME
          title: <FatalToastTitle />,
          text: <FatalToastText reloadWindow={this.services.reloadWindow} />,
        },
      ]);
    } else {
      this._toasts.next([
        {
          id: 'recoverable-123', // FIXME
          title: <RecoverableToastTitle />,
          text: <RecoverableToastText reloadWindow={this.services.reloadWindow} />,
        },
      ]);
    }
  }
}

export type Toasts = EuiGlobalToastListProps['toasts'];

export const StatefulToastList = ({ toasts$ }: { toasts$: Rx.Observable<Toasts> }) => {
  const toasts = useObservable(toasts$);
  return <EuiGlobalToastList toasts={toasts} dismissToast={() => {}} toastLifeTimeMs={9000} />;
};
