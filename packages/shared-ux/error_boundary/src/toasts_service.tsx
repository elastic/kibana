/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import * as Rx from 'rxjs';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiGlobalToastListProps } from '@elastic/eui';

import { ErrorBoundaryUIServices } from '../types';

const DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON = 'pageReloadButton';
const DATA_TEST_SUBJ_PAGE_DETAILS_BUTTON = 'showDetailsButton';

interface ErrorToastTextProps {
  error: Error;
  reloadWindow: () => void;
}

export const errorToastTitle = i18n.translate('sharedUXPackages.error_boundary.toastError.title', {
  defaultMessage: 'A fatal error was encountered.',
});
export const ErrorToastText = ({ reloadWindow }: ErrorToastTextProps) => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <p>Try refreshing the page.</p>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" direction="row">
          <EuiFlexItem>
            <EuiButton
              size="s"
              onClick={() => {}}
              data-test-subj={DATA_TEST_SUBJ_PAGE_DETAILS_BUTTON}
              fill={false}
              color="danger"
            >
              {i18n.translate('sharedUXPackages.error_boundary.toastError.showDetailsButtonLabel', {
                defaultMessage: 'Show details',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              size="s"
              onClick={reloadWindow}
              data-test-subj={DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON}
              fill={true}
              color="danger"
            >
              {i18n.translate('sharedUXPackages.error_boundary.toastError.pageRefreshButtonLabel', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export class ToastsService {
  private _toasts = new Rx.BehaviorSubject<EuiGlobalToastListProps['toasts']>([]);

  constructor(private services: ErrorBoundaryUIServices) {}

  public get toasts() {
    return this._toasts.asObservable();
  }

  public addError(error: Error) {
    this._toasts.next([
      {
        id: 'foo',
        title: errorToastTitle,
        text: <ErrorToastText error={error} reloadWindow={this.services.reloadWindow} />,
      },
    ]);
  }
}
