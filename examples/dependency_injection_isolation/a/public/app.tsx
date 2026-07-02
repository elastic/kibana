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
import { type IGlobalService, type INameService, GlobalServiceToken, NameServiceToken } from '@kbn/dependency-injection-c/public';

@injectable()
export class App {
  public static id = 'dependencyInjectionA';
  public static title = 'Dependency Injection A';
  public static visibleIn = [];

  constructor(
    @inject(ApplicationParameters) private readonly params: AppMountParameters,
    @inject(CoreStart('injection')) private readonly di: CoreDiServiceStart,
    @inject(GlobalServiceToken) private readonly globalService: IGlobalService,
    @inject(NameServiceToken) private readonly nameService: INameService
  ) {}

  mount(): AppUnmount {
    const { element } = this.params;
    ReactDOM.render(
      <>
        {this.globalService.getName()} {this.nameService.getName()}
      </>,
      element
    );

    return () => ReactDOM.unmountComponentAtNode(element);
  }
}
