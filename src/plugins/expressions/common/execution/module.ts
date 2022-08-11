/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule, interfaces } from 'inversify';
import { ExpressionAstExpression, formatExpression, parseExpression } from '../ast';
import { Executor } from '../executor';
import { ExpressionExecutionParams } from '../service';
import { createExecutionContainer } from './container';
import {
  ContractFactory,
  ContractFactoryToken,
  Execution,
  ParamsToken,
  StateToken,
} from './execution';
import { ExecutionContract, ExpressionToken } from './execution_contract';

export const AstToken: interfaces.ServiceIdentifier<ExpressionAstExpression> = Symbol.for('Ast');

export function ExecutionModule(
  ast: string | ExpressionAstExpression,
  params: ExpressionExecutionParams
): ContainerModule {
  return new ContainerModule((bind) => {
    bind(AstToken)
      .toDynamicValue(() => (typeof ast === 'string' ? parseExpression(ast) : ast))
      .inSingletonScope();
    bind(ContractFactoryToken).toFactory(
      ({ container }): ContractFactory =>
        () =>
          container.get(ExecutionContract)
    );
    bind(ExpressionToken)
      .toDynamicValue(() => (typeof ast === 'string' ? ast : formatExpression(ast)))
      .inSingletonScope();
    bind(ParamsToken).toConstantValue(params);
    bind(StateToken)
      .toDynamicValue(({ container }) =>
        createExecutionContainer({
          ...container.get(Executor).state,
          state: 'not-started',
          ast: container.get(AstToken),
        })
      )
      .inSingletonScope();
    bind(Execution).toSelf().inSingletonScope();
    bind(ExecutionContract).toSelf().inSingletonScope();
  });
}
