/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { render } from 'react-dom';
import { ReplaySubject, first, tap } from 'rxjs';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { ThemeServiceSetup } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { FatalError, FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { FatalErrorScreen } from './fatal_error_screen';
import { formatError, formatStack } from './utils';
import { GenericError } from './generic_error';

/** @internal */
export interface FatalErrorsServiceSetupDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export class FatalErrorsService {
  private readonly error$ = new ReplaySubject<FatalError>();
  private fatalErrors?: FatalErrorsSetup;
  private handlers = new Map<(error: FatalError) => boolean, (errors: FatalError[]) => ReactNode>();

  /**
   *
   * @param rootDomElement
   * @param onFirstErrorCb - Callback function that gets executed after the first error,
   *   but before the FatalErrorsService renders the error to the DOM.
   */
  constructor(private rootDomElement: HTMLElement, private onFirstErrorCb: () => void) {}

  public setup(deps: FatalErrorsServiceSetupDeps) {
    this.error$
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
        this.error$.next({ error, source });

        if (error instanceof Error) {
          // make stack traces clickable by putting whole error in the console
          // eslint-disable-next-line no-console
          console.error(error);
        }

        throw error;
      },

      catch: this.handlers.set.bind(this.handlers),
    };

    this.setupGlobalErrorHandlers();

    return this.fatalErrors;
  }

  public start() {
    if (!this.fatalErrors) {
      throw new Error('FatalErrorsService#setup() must be invoked before start.');
    }

    return this.fatalErrors;
  }

  private renderError(deps: FatalErrorsServiceSetupDeps) {
    const { analytics, i18n, theme, injectedMetadata } = deps;
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
        <FatalErrorScreen error$={this.error$}>
          {(errors) =>
            this.renderCustomError(errors) || (
              <GenericError
                buildNumber={injectedMetadata.getKibanaBuildNumber()}
                errors={errors}
                kibanaVersion={injectedMetadata.getKibanaVersion()}
              />
            )
          }
        </FatalErrorScreen>
      </KibanaRootContextProvider>,
      container
    );
  }

  private renderCustomError(errors: FatalError[]) {
    for (const [condition, handler] of this.handlers) {
      if (errors.length && errors.every((error) => condition(error))) {
        return handler(errors);
      }
    }

    return null;
  }

  private setupGlobalErrorHandlers() {
    window.addEventListener?.('unhandledrejection', (e) => {
      // eslint-disable-next-line no-console
      console.log(`Detected an unhandled Promise rejection.\n
      Message: ${formatError(e.reason)}\n
      Stack: ${formatStack(e.reason)}`);
    });
  }
}
