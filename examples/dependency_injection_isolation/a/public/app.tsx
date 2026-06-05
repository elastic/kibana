/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { inject, injectable } from 'inversify';
import type { AppMountParameters, AppUnmount } from '@kbn/core-application-browser';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { ApplicationParameters, CoreStart } from '@kbn/core-di-browser';

@injectable()
export class App {
  public static id = 'dependencyInjectionA';
  public static title = 'Dependency Injection A';
  public static visibleIn = [];

  constructor(
    @inject(ApplicationParameters) private readonly params: AppMountParameters,
    @inject(CoreStart('injection')) private readonly di: CoreDiServiceStart
  ) {}

  mount(): AppUnmount {
    const { element } = this.params;
    ReactDOM.render(<>A</>, element);

    return () => ReactDOM.unmountComponentAtNode(element);
  }
}
