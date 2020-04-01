/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { astBuilder } from './ast_builder';

describe('ast builder', () => {
  test('correctly builds the AST', () => {
    const exprAST = astBuilder.createExpression([
      astBuilder.createFunction('test1', {
        arg1: true,
        arg2: 'test',
        arg3: 4,
        arg4: astBuilder.createExpression([
          astBuilder.createFunction('subexpr_funct', {
            arg1: true,
          }),
        ]),
      }),
      astBuilder.createFunction('test2', {
        arg1: true,
        arg2: 'test',
      }),
      astBuilder.createFunction('test3', {
        arg1: true,
      }),
    ]);

    expect(exprAST).toMatchSnapshot();
  });

  test('correctly builds the AST using builder functions', () => {
    const ast = astBuilder
      .createExpressionBuilder([
        astBuilder
          .createFunctionBuilder('test1', {
            arg1: [true, false],
            arg2: astBuilder
              .createExpressionBuilder()
              .addFunction(
                astBuilder
                  .createFunctionBuilder('test2', {
                    arg1: true,
                  })
                  .toAst()
              )
              .toAst(),
          })
          .toAst(),
      ])
      .addFunction(astBuilder.createFunctionBuilder('test3').toAst())
      .toAst();

    expect(ast).toMatchSnapshot();
  });

  test('correctly builds the AST using combination of builders', () => {
    const ast = astBuilder.createExpressionBuilder();
    ast.addFunction(
      astBuilder.createFunction('test1', {
        arg1: [true, false],
        arg2: astBuilder.createExpression([astBuilder.createFunction('test2')]),
      })
    );
    const fn = astBuilder.createFunctionBuilder('test3');
    fn.addArgument('arg1', true);
    fn.addArgument(
      'arg2',
      astBuilder.createExpression([
        astBuilder
          .createFunctionBuilder('test4')
          .addArgument('arg1', true)
          .toAst(),
      ])
    );
    ast.addFunction(fn.toAst());

    expect(ast.toAst()).toMatchSnapshot();
  });
});
