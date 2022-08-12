/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule } from 'inversify';
import {
  ExpressionsService,
  ExpressionsServiceForkFactory,
  ExpressionsServiceForkFactoryToken,
} from './expressions_services';
import { ExpressionsServiceFork, NamespaceToken } from './expressions_fork';

export function ServiceModule() {
  return new ContainerModule((bind) => {
    bind(ExpressionsServiceForkFactoryToken).toFactory(
      ({ container }): ExpressionsServiceForkFactory =>
        (namespace) => {
          const scope = container.createChild();
          scope.bind(NamespaceToken).toConstantValue(namespace);
          scope.bind(ExpressionsServiceFork).toSelf().inSingletonScope();

          return scope.get(ExpressionsServiceFork);
        }
    );
    bind(ExpressionsService).toSelf().inSingletonScope();
  });
}
