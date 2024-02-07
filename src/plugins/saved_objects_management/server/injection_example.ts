/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { inject, injectable, ServiceIdentifier, ServiceType } from '@kbn/core-di-common';
import { coreGlobalService, coreRequestServices } from '@kbn/core/server';

//////////////////////////
// example of a global-scoped service

export interface MyExampleServiceInterface {
  doSomething(): void;
}

export const myExampleServiceId: ServiceIdentifier<MyExampleServiceInterface> =
  Symbol.for('myExampleService');

@injectable()
export class MyExampleService implements MyExampleServiceInterface {
  constructor(
    @inject(coreGlobalService.logger)
    private logger: ServiceType<typeof coreGlobalService.logger>
  ) {}

  doSomething() {
    this.logger.get('test').info('I printed something to the console using a DI service');
  }
}

/////////////////////////
// example of a request-scoped service

export interface MyExampleRequestHandlerInterface {
  logSomethingRequestRelated(): void;
}

export const myExampleRequestHandlerId: ServiceIdentifier<MyExampleRequestHandlerInterface> =
  Symbol.for('myExampleRequestHandler');

@injectable()
export class MyExampleRequestHandler implements MyExampleRequestHandlerInterface {
  constructor(
    @inject(coreGlobalService.logger)
    private logger: ServiceType<typeof coreGlobalService.logger>,
    @inject(coreRequestServices.request)
    private request: ServiceType<typeof coreRequestServices.request>
  ) {}

  logSomethingRequestRelated() {
    this.logger.get('http').info(`Serving request with id ${this.request.uuid}`);
  }
}
