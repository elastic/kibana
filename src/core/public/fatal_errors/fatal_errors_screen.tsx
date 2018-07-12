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

import React from 'react';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';

import { ErrorInfo } from './get_error_info';

interface Props {
  kibanaVersion: string;
  buildNumber: number;
  errorInfo$: Rx.Observable<ErrorInfo>;
}

interface State {
  errors: ErrorInfo[];
}

export class FatalErrorsScreen extends React.Component<Props, State> {
  public state: State = {
    errors: [],
  };

  private subscription?: Rx.Subscription;

  public componentDidMount() {
    // reload the page if hash-based navigation is attempted
    window.addEventListener('hashchange', () => {
      window.location.reload();
    });

    // consume error notifications and set them to the component state
    this.subscription = this.props.errorInfo$
      .pipe(
        tap(error => {
          this.setState(state => {
            const isDuplicate = state.errors.some(
              existing => JSON.stringify(existing) === JSON.stringify(error)
            );

            if (isDuplicate) {
              return state;
            }

            return {
              ...state,
              errors: [...state.errors, error],
            };
          });
        })
      )
      .subscribe({
        error(error) {
          // tslint:disable-next-line no-console
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

  public onClickGoBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.history.back();
  };

  public onClickClearSession = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    return (
      <div className="kuiViewContent kuiViewContent--constrainedWidth kuiViewContentItem">
        <div style={{ textAlign: 'center' }}>
          <h1 className="kuiTitle kuiVerticalRhythm">Oops!</h1>

          <p className="kuiText kuiVerticalRhythm">
            Looks like something went wrong. Refreshing may do the trick.
          </p>

          <div
            className="kuiButtonGroup kuiVerticalRhythm"
            style={{ textAlign: 'center', display: 'inline-block' }}
          >
            <button className="kuiButton kuiButton--primary" onClick={this.onClickGoBack}>
              Go back
            </button>

            <button className="kuiButton kuiButton--hollow" onClick={this.onClickClearSession}>
              Clear your session
            </button>
          </div>
        </div>

        {this.state.errors.map((error, i) => (
          <React.Fragment key={i}>
            <h1>
              <i className="fa fa-warning-triangle" />
            </h1>
            <div className="panel panel-danger">
              <div className="panel-heading">
                <h1 className="panel-title">
                  <i className="fa fa-warning" /> Fatal Error
                </h1>
              </div>
              <div className="panel-body fatal-body">{error.message}</div>
              <div className="panel-footer">
                <pre>
                  {`Version: ${this.props.kibanaVersion}` +
                    '\n' +
                    `Build: ${this.props.buildNumber}`}
                </pre>
              </div>
              {error.stack && (
                <div className="panel-footer">
                  <pre>{error.stack}</pre>
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }
}
