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
import { render } from 'react-dom';
import * as Rx from 'rxjs';
import { first, tap } from 'rxjs/operators';

import { I18nStartContract } from '../i18n';
import { InjectedMetadataService } from '../injected_metadata';
import { FatalErrorsScreen } from './fatal_errors_screen';
import { ErrorInfo, getErrorInfo } from './get_error_info';

export interface FatalErrorsParams {
  rootDomElement: HTMLElement;
  injectedMetadata: InjectedMetadataService;
  stopCoreSystem: () => void;
}

interface Deps {
  i18n: I18nStartContract;
}

export class FatalErrorsService {
  private readonly errorInfo$ = new Rx.ReplaySubject<ErrorInfo>();
  private i18n?: I18nStartContract;

  constructor(private params: FatalErrorsParams) {
    this.errorInfo$
      .pipe(
        first(),
        tap(() => this.onFirstError())
      )
      .subscribe({
        error: error => {
          // tslint:disable-next-line no-console
          console.error('Uncaught error in fatal error screen internals', error);
        },
      });
  }

  public add = (error: Error | string, source?: string) => {
    const errorInfo = getErrorInfo(error, source);

    this.errorInfo$.next(errorInfo);

    if (error instanceof Error) {
      // make stack traces clickable by putting whole error in the console
      // tslint:disable-next-line no-console
      console.error(error);
    }

    throw error;
  };

  public start({ i18n }: Deps) {
    this.i18n = i18n;

    return {
      add: this.add,
      get$: () => {
        return this.errorInfo$.asObservable();
      },
    };
  }

  private onFirstError() {
    // stop the core systems so that things like the legacy platform are stopped
    // and angular/react components are unmounted;
    this.params.stopCoreSystem();

    // delete all content in the rootDomElement
    this.params.rootDomElement.textContent = '';

    // create and mount a container for the <FatalErrorScreen>
    const container = document.createElement('div');
    this.params.rootDomElement.appendChild(container);

    // If error occurred before I18nService has been started we don't have any
    // i18n context to provide.
    const I18nContext = this.i18n ? this.i18n.Context : React.Fragment;

    render(
      <I18nContext>
        <FatalErrorsScreen
          buildNumber={this.params.injectedMetadata.getKibanaBuildNumber()}
          kibanaVersion={this.params.injectedMetadata.getKibanaVersion()}
          errorInfo$={this.errorInfo$}
        />
      </I18nContext>,
      container
    );
  }
}

export type FatalErrorsStartContract = ReturnType<FatalErrorsService['start']>;
