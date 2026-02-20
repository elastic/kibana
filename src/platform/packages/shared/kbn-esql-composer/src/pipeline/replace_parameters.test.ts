/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, BasicPrettyPrinter, synth, parse } from '@kbn/esql-language';
import { replaceParameters } from './replace_parameters';
import type { Query } from '../types';
import { buildQueryAst } from './build_query_ast';

describe('buildQueryAst', () => {
  const { root } = parse('logs-*');

  it('replaces literal using named parameter', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE host.name == ?host`],
      params: [{ host: 'my-host' }],
    };

    const ast = buildQueryAst(source);
    replaceParameters(ast, source.params);

    expect(ast.commands[0].args[0]).toEqual(
      expect.objectContaining(
        Builder.expression.func.node({
          name: '==',
          subtype: 'binary-expression',
          args: [
            Builder.expression.column({
              args: [Builder.identifier({ name: 'host' }), Builder.identifier({ name: 'name' })],
            }),
            Builder.expression.literal.string('my-host'),
          ],
        })
      )
    );

    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name == "my-host"');
  });

  it('replaces column using named parameter', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE host.??field == "my-host"`],
      params: [{ field: 'name' }],
    };

    const ast = buildQueryAst(source);
    replaceParameters(ast, source.params);

    expect(ast.commands[0].args[0]).toEqual(
      expect.objectContaining(
        Builder.expression.func.node({
          name: '==',
          subtype: 'binary-expression',
          args: [
            Builder.expression.column({
              args: [Builder.identifier({ name: 'host' }), Builder.identifier({ name: 'name' })],
            }),
            Builder.expression.literal.string('my-host'),
          ],
        })
      )
    );

    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name == "my-host"');
  });

  it('replaces column using named parameter adding backticks', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE host.??field == "my-host"`],
      params: [{ field: 'name.1' }],
    };

    const ast = buildQueryAst(source);
    replaceParameters(ast, source.params);

    expect(ast.commands[0].args[0]).toEqual(
      expect.objectContaining(
        Builder.expression.func.node({
          name: '==',
          subtype: 'binary-expression',
          args: [
            Builder.expression.column({
              args: [
                Builder.identifier({ name: 'host' }),
                Builder.identifier({ name: 'name' }),
                Builder.identifier({ name: '1' }),
              ],
            }),
            Builder.expression.literal.string('my-host'),
          ],
        })
      )
    );

    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name.`1` == "my-host"');
  });

  it('replaces column using named parameter without adding backticks', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE ??field == 10000`],
      params: [{ field: 'span.duration.us' }],
    };

    const ast = buildQueryAst(source);
    replaceParameters(ast, source.params);

    expect(ast.commands[0].args[0]).toEqual(
      expect.objectContaining(
        Builder.expression.func.node({
          name: '==',
          subtype: 'binary-expression',
          args: [
            Builder.expression.column({
              args: [
                Builder.identifier({ name: 'span' }),
                Builder.identifier({ name: 'duration' }),
                Builder.identifier({ name: 'us' }),
              ],
            }),
            Builder.expression.literal.integer(10000),
          ],
        })
      )
    );

    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('span.duration.us == 10000');
  });

  it('replaces function using named parameter', () => {
    const source: Query = {
      root: Builder.expression.query([]),
      commands: [synth.cmd`STATS ?funcName(foo) BY bar`],
      params: [{ funcName: 'AVG' }],
    };

    const ast = buildQueryAst(source);

    replaceParameters(ast, source.params);

    expect(ast.commands[0].args[0]).toEqual(
      expect.objectContaining(
        Builder.expression.func.node({
          name: 'AVG',
          args: [Builder.expression.column('foo')],
          operator: Builder.identifier('AVG'),
        })
      )
    );

    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('STATS AVG(foo) BY bar');
  });

  it('does not replace missing parameter', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE host.name == ?host`],
      params: [{ other: 'value' }],
    };

    const ast = buildQueryAst(source);
    replaceParameters(ast, source.params);

    expect(ast.commands[0].args[0]).toEqual(
      expect.objectContaining(
        Builder.expression.func.node({
          name: '==',
          subtype: 'binary-expression',
          args: [
            Builder.expression.column({
              args: [Builder.identifier({ name: 'host' }), Builder.identifier({ name: 'name' })],
            }),
            Builder.param.named({ value: 'host' }),
          ],
        })
      )
    );

    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name == ?host');
  });
});
