/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule } from 'inversify';
import { Execution, ExecutionModule } from '../execution';
import { typeSpecs } from '../expression_types';
import { ContainerToken, Executor, ExecutionFactory, ExecutionFactoryToken } from './executor';
import { createExecutorContainer } from './container';

export function ExecutorModule(): ContainerModule {
  return new ContainerModule((bind) => {
    bind(ContainerToken)
      .toDynamicValue(() => createExecutorContainer())
      .inSingletonScope();
    bind(ExecutionFactoryToken).toFactory(
      ({ container }): ExecutionFactory =>
        (ast, params) => {
          const scope = container.createChild();
          scope.load(ExecutionModule(ast, params));

          return scope.get(Execution);
        }
    );
    bind(Executor)
      .toSelf()
      .inSingletonScope()
      .onActivation((context, executor) => {
        for (const type of typeSpecs) {
          executor.registerType(type);
        }

        return executor;
      });
  });
}
