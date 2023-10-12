/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import * as Rx from 'rxjs';

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiGlobalToastListProps,
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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

export interface ErrorCalloutProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  reloadWindow: () => void;
}

export const ErrorCallout = (props: ErrorCalloutProps) => {
  const { error, errorInfo, name: errorComponentName, reloadWindow } = props;
  const errorBoundaryAccordionId = useGeneratedHtmlId({ prefix: 'errorBoundaryAccordion' });
  return (
    <EuiCallOut title="A fatal error was encountered" color="danger" iconType="error">
      <p>Try refreshing this page.</p>
      <EuiAccordion id={errorBoundaryAccordionId} buttonContent="Show detail">
        <EuiPanel paddingSize="m">
          <EuiCodeBlock>
            {errorComponentName && (
              <p>
                An error occurred in <EuiCode>{errorComponentName}</EuiCode>
              </p>
            )}
            {error?.message && <p>{error.message}</p>}
            {errorInfo?.componentStack}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiAccordion>
      <EuiSpacer />
      <p>
        <EuiButton color="danger" fill={true} onClick={reloadWindow}>
          Refresh
        </EuiButton>
      </p>
    </EuiCallOut>
  );
};

export const ErrorInline = (_props: ErrorCalloutProps) => {
  return <EuiCallOut color="danger" iconType="error" title="Error: unable to load." />;
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
