/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from 'react-dom';
import * as Rx from 'rxjs';
import { first, tap } from 'rxjs/operators';

import { I18nStart } from '../i18n';
import { InjectedMetadataSetup } from '../injected_metadata';
import { FatalErrorsScreen } from './fatal_errors_screen';
import { FatalErrorInfo, getErrorInfo } from './get_error_info';

interface Deps {
  i18n: I18nStart;
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

/**
 * FatalErrors stop the Kibana Public Core and displays a fatal error screen
 * with details about the Kibana build and the error.
 *
 * @public
 */
export type FatalErrorsStart = FatalErrorsSetup;

/** @interal */
export class FatalErrorsService {
  private readonly errorInfo$ = new Rx.ReplaySubject<FatalErrorInfo>();
  private fatalErrors?: FatalErrorsSetup;

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

    this.setupGlobalErrorHandlers(this.fatalErrors!);

    return this.fatalErrors!;
  }

  public start() {
    const { fatalErrors } = this;
    if (!fatalErrors) {
      throw new Error('FatalErrorsService#setup() must be invoked before start.');
    }
    return fatalErrors;
  }

  private renderError(injectedMetadata: InjectedMetadataSetup, i18n: I18nStart) {
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

  private setupGlobalErrorHandlers(fatalErrorsSetup: FatalErrorsSetup) {
    if (window.addEventListener) {
      window.addEventListener('unhandledrejection', function (e) {
        console.log(`Detected an unhandled Promise rejection.\n${e.reason}`); // eslint-disable-line no-console
      });
    }
  }
}
