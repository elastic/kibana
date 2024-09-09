/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
} from '@elastic/eui';
import React from 'react';
import { Observable, Subscription, merge, tap, fromEvent } from 'rxjs';

import { FormattedMessage } from '@kbn/i18n-react';

import { FatalErrorInfo } from '@kbn/core-fatal-errors-browser';

interface Props {
  kibanaVersion: string;
  buildNumber: number;
  errorInfo$: Observable<FatalErrorInfo>;
}

interface State {
  errors: FatalErrorInfo[];
}

export class FatalErrorsScreen extends React.Component<Props, State> {
  public state: State = {
    errors: [],
  };

  private subscription?: Subscription;

  public componentDidMount() {
    this.subscription = merge(
      // reload the page if hash-based navigation is attempted
      fromEvent(window, 'hashchange').pipe(
        tap(() => {
          window.location.reload();
        })
      ),

      // consume error notifications and set them to the component state
      this.props.errorInfo$.pipe(
        tap((error) => {
          this.setState((state) => ({
            ...state,
            errors: [...state.errors, error],
          }));
        })
      )
    ).subscribe({
      error(error) {
        // eslint-disable-next-line no-console
        console.error('Uncaught error in fatal error screen internals', error);
      },
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public render() {
    return (
      <EuiPage
        style={{ minHeight: '100vh', alignItems: 'center' }}
        data-test-subj="fatalErrorScreen"
      >
        <EuiPageBody>
          <EuiPageSection alignment="center">
            <EuiEmptyPrompt
              iconType="warning"
              iconColor="danger"
              title={
                <h2>
                  <FormattedMessage
                    id="core.fatalErrors.somethingWentWrongTitle"
                    defaultMessage="Something went wrong"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="core.fatalErrors.tryRefreshingPageDescription"
                    defaultMessage="Try refreshing the page. If that doesn't work, go back to the previous page or
                    clear your session data."
                  />
                </p>
              }
              actions={[
                <EuiButton
                  color="primary"
                  fill
                  onClick={this.onClickClearSession}
                  data-test-subj="clearSession"
                >
                  <FormattedMessage
                    id="core.fatalErrors.clearYourSessionButtonLabel"
                    defaultMessage="Clear your session"
                  />
                </EuiButton>,
                <EuiButtonEmpty onClick={this.onClickGoBack} data-test-subj="goBack">
                  <FormattedMessage
                    id="core.fatalErrors.goBackButtonLabel"
                    defaultMessage="Go back"
                  />
                </EuiButtonEmpty>,
              ]}
            />
            {this.state.errors.map((error, i) => (
              <EuiCallOut key={i} title={error.message} color="danger" iconType="warning">
                <EuiCodeBlock language="bash" className="eui-textBreakAll">
                  {`Version: ${this.props.kibanaVersion}` +
                    '\n' +
                    `Build: ${this.props.buildNumber}` +
                    '\n' +
                    (error.stack ? error.stack : '')}
                </EuiCodeBlock>
              </EuiCallOut>
            ))}
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    );
  }

  private onClickGoBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.history.back();
  };

  private onClickClearSession = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '';
    window.location.reload();
  };
}
