/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, BasicPrettyPrinter, synth, parse } from '@kbn/esql-ast';
import { buildQueryAst } from './build_query_ast'; // Adjust to correct path
import { Query } from '../types'; // Adjust to correct path

describe('buildQueryAst', () => {
  const { root } = parse('logs-*');

  it('replaces literal using named parameter', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE host.name == ?host`],
      params: [{ host: 'my-host' }],
    };

    const ast = buildQueryAst(source);
    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name == "my-host"');
  });

  it('replaces column using named parameter', () => {
    const source: Query = {
      root,
      commands: [synth.cmd`WHERE host.??field == 'my-host'`],
      params: [{ field: 'name' }],
    };

    const ast = buildQueryAst(source);
    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name == "my-host"');
  });

  it('replaces function using named parameter', () => {
    const source: Query = {
      root: Builder.expression.query([]),
      commands: [synth.cmd`STATS ?funcName(foo) BY bar`],
      params: [{ funcName: 'AVG' }],
    };

    const ast = buildQueryAst(source);
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
    const queryString = BasicPrettyPrinter.print(ast, { multiline: false });

    expect(queryString).toContain('host.name == ?host');
  });
});
