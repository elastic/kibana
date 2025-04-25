/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ContextType } from 'react';
import ReactDOM from 'react-dom';
import { inject, injectable } from 'inversify';
import { AppMountParameters, AppUnmount } from '@kbn/core-application-browser';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { ApplicationParameters, Context, CoreStart } from '@kbn/core-di-browser';
import { App } from './app';

@injectable()
export class Main {
  public static id = 'dependencyInjectionExample';
  public static title = 'Dependency Injection Example';
  public static visibleIn = [];

  constructor(
    @inject(ApplicationParameters) private readonly params: AppMountParameters,
    @inject(CoreStart('injection')) private readonly di: CoreDiServiceStart
  ) {}

  mount(): AppUnmount {
    const { element } = this.params;
    ReactDOM.render(
      <Context.Provider value={this.di.getContainer() as ContextType<typeof Context>}>
        <App />
      </Context.Provider>,
      element
    );

    return () => ReactDOM.unmountComponentAtNode(element);
  }
}
