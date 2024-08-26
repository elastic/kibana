/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Application } from '@kbn/core-di-browser';
import { ContainerModule } from 'inversify';
import { Main } from './main';
import { EchoService } from './service';

const containerModule = new ContainerModule((bind) => {
  bind(Main).toSelf().inRequestScope();
  bind(EchoService).toSelf().inSingletonScope();
  bind(Application).toConstantValue(Main);
});

export { containerModule as module };
