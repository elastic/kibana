/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Application } from '@kbn/core-di-browser';
import { ContainerModule } from 'inversify';
import { Global } from '@kbn/core-di-internal';
import { GlobalService, GlobalServiceToken, NameService, NameServiceToken } from '../common';
import { App } from './app';

export const module = new ContainerModule(({ bind }) => {
  bind(Application).toConstantValue(App);
  bind(Global).toConstantValue(GlobalServiceToken);

  bind(App).toSelf().inRequestScope();
  bind(GlobalServiceToken).to(GlobalService).inSingletonScope();
  bind(NameServiceToken).to(NameService).inSingletonScope();
});

export {
  type IGlobalService,
  type INameService,
  GlobalServiceToken,
  NameServiceToken,
} from '../common';
