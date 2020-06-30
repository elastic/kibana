/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import React from 'react';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';

import { FormattedMessage } from '@kbn/i18n/react';

import { FatalErrorInfo } from './get_error_info';

interface Props {
  kibanaVersion: string;
  buildNumber: number;
  errorInfo$: Rx.Observable<FatalErrorInfo>;
}

interface State {
  errors: FatalErrorInfo[];
}

export class FatalErrorsScreen extends React.Component<Props, State> {
  public state: State = {
    errors: [],
  };

  private subscription?: Rx.Subscription;

  public componentDidMount() {
    this.subscription = Rx.merge(
      // reload the page if hash-based navigation is attempted
      Rx.fromEvent(window, 'hashchange').pipe(
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
      <EuiPage style={{ minHeight: '100vh' }}>
        <EuiPageBody>
          <EuiPageContent verticalPosition="center" horizontalPosition="center">
            <EuiEmptyPrompt
              iconType="alert"
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
              <EuiCallOut key={i} title={error.message} color="danger" iconType="alert">
                <EuiCodeBlock language="bash" className="eui-textBreakAll">
                  {`Version: ${this.props.kibanaVersion}` +
                    '\n' +
                    `Build: ${this.props.buildNumber}` +
                    '\n' +
                    (error.stack ? error.stack : '')}
                </EuiCodeBlock>
              </EuiCallOut>
            ))}
          </EuiPageContent>
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
