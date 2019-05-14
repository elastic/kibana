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

import { I18nSetup } from '../i18n';
import { InjectedMetadataSetup } from '../';
import { FatalErrorsScreen } from './fatal_errors_screen';
import { FatalErrorInfo, getErrorInfo } from './get_error_info';

interface Deps {
  i18n: I18nSetup;
  injectedMetadata: InjectedMetadataSetup;
}

/**
 * FatalErrors stop the Kibana Public Core and displays a fatal error screen
 * with details about the Kibana build and the error.
 *
 * @public
 */
export interface FatalErrorsSetup {
  /**
   * Add a new fatal error. This will stop the Kibana Public Core and display
   * a fatal error screen with details about the Kibana build and the error.
   *
   * @param error - The error to display
   * @param source - Adds a prefix of the form `${source}: ` to the error message
   */
  add: (error: string | Error, source?: string) => never;

  /**
   * An Observable that will emit whenever a fatal error is added with `add()`
   */
  get$: () => Rx.Observable<FatalErrorInfo>;
}

/** @interal */
export class FatalErrorsService {
  private readonly errorInfo$ = new Rx.ReplaySubject<FatalErrorInfo>();

  /**
   *
   * @param rootDomElement
   * @param onFirstErrorCb - Callback function that gets executed after the first error,
   *   but before the FatalErrorsService renders the error to the DOM.
   */
  constructor(private rootDomElement: HTMLElement, private onFirstErrorCb: () => void) {}

  public setup({ i18n, injectedMetadata }: Deps) {
    this.errorInfo$
      .pipe(
        first(),
        tap(() => {
          this.onFirstErrorCb();
          this.renderError(injectedMetadata, i18n);
        })
      )
      .subscribe({
        error: error => {
          // eslint-disable-next-line no-console
          console.error('Uncaught error in fatal error service internals', error);
        },
      });

    const fatalErrorsSetup: FatalErrorsSetup = {
      add: (error, source?) => {
        const errorInfo = getErrorInfo(error, source);

        this.errorInfo$.next(errorInfo);

        if (error instanceof Error) {
          // make stack traces clickable by putting whole error in the console
          // eslint-disable-next-line no-console
          console.error(error);
        }

        throw error;
      },
      get$: () => {
        return this.errorInfo$.asObservable();
      },
    };

    return fatalErrorsSetup;
  }

  private renderError(injectedMetadata: InjectedMetadataSetup, i18n: I18nSetup) {
    // delete all content in the rootDomElement
    this.rootDomElement.textContent = '';

    // create and mount a container for the <FatalErrorScreen>
    const container = document.createElement('div');
    this.rootDomElement.appendChild(container);

    render(
      <i18n.Context>
        <FatalErrorsScreen
          buildNumber={injectedMetadata.getKibanaBuildNumber()}
          kibanaVersion={injectedMetadata.getKibanaVersion()}
          errorInfo$={this.errorInfo$}
        />
      </i18n.Context>,
      container
    );
  }
}
