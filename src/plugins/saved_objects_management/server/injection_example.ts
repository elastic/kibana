/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inject, injectable, ServiceIdentifier } from '@kbn/core-di-common';
import { coreGlobalServiceIds, LoggerFactory } from '@kbn/core/server';

export interface MyExampleServiceInterface {
  doSomething(): void;
}

export const myExampleServiceId: ServiceIdentifier<MyExampleServiceInterface> =
  Symbol.for('myExampleService');

@injectable()
export class MyExampleService implements MyExampleServiceInterface {
  constructor(@inject(coreGlobalServiceIds.logger) private logger: LoggerFactory) {}

  doSomething() {
    this.logger.get('test').info('I printed something to the console using a DI service');
  }
}
