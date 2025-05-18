/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from 'react-dom';
import { ReplaySubject, first, tap } from 'rxjs';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { ThemeServiceSetup } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { FatalErrorInfo, FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { FatalErrorsScreen } from './fatal_errors_screen';
import { getErrorInfo } from './get_error_info';

/** @internal */
export interface FatalErrorsServiceSetupDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export class FatalErrorsService {
  private readonly errorInfo$ = new ReplaySubject<FatalErrorInfo>();
  private fatalErrors?: FatalErrorsSetup;

  /**
   *
   * @param rootDomElement
   * @param onFirstErrorCb - Callback function that gets executed after the first error,
   *   but before the FatalErrorsService renders the error to the DOM.
   */
  constructor(private rootDomElement: HTMLElement, private onFirstErrorCb: () => void) {}

  public setup(deps: FatalErrorsServiceSetupDeps) {
    this.errorInfo$
      .pipe(
        first(),
        tap(() => {
          this.onFirstErrorCb();
          this.renderError(deps);
        })
      )
      .subscribe({
        error: (error) => {
          // eslint-disable-next-line no-console
          console.error('Uncaught error in fatal error service internals', error);
        },
      });

    this.fatalErrors = {
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

    this.setupGlobalErrorHandlers();

    return this.fatalErrors!;
  }

  public start() {
    const { fatalErrors } = this;
    if (!fatalErrors) {
      throw new Error('FatalErrorsService#setup() must be invoked before start.');
    }
    return fatalErrors;
  }

  private renderError({ analytics, i18n, theme, injectedMetadata }: FatalErrorsServiceSetupDeps) {
    // delete all content in the rootDomElement
    this.rootDomElement.textContent = '';

    // create and mount a container for the <FatalErrorScreen>
    const container = document.createElement('div');
    this.rootDomElement.appendChild(container);

    render(
      <KibanaRootContextProvider
        analytics={analytics}
        i18n={i18n}
        theme={theme}
        globalStyles={true}
      >
        <FatalErrorsScreen
          buildNumber={injectedMetadata.getKibanaBuildNumber()}
          kibanaVersion={injectedMetadata.getKibanaVersion()}
          errorInfo$={this.errorInfo$}
        />
      </KibanaRootContextProvider>,
      container
    );
  }

  private setupGlobalErrorHandlers() {
    if (window.addEventListener) {
      window.addEventListener('unhandledrejection', (e) => {
        const { message, stack } = getErrorInfo(e.reason);
        // eslint-disable-next-line no-console
        console.log(`Detected an unhandled Promise rejection.\n
        Message: ${message}\n
        Stack: ${stack}`);
      });
    }
  }
}
