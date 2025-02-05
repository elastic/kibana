/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../../pretty_print';
import * as mutate from '../..';
import { EsqlQuery } from '../../../query';
import { Builder } from '../../../builder';
import { ESQLFunction } from '../../../types';

describe('scenarios', () => {
  it('can remove the found WHERE command', () => {
    const src =
      'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 123 == add(1 + fn(NOT -(a.b.c::ip)::INTEGER /* comment */))';
    const query = EsqlQuery.fromSrc(src);

    const [command1] = mutate.commands.where.byField(query.ast, ['a', 'b', 'c'])!;
    mutate.generic.commands.remove(query.ast, command1);

    const text1 = BasicPrettyPrinter.print(query.ast);

    expect(text1).toBe('FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2');

    const [command2] = mutate.commands.where.byField(query.ast, 'a')!;
    mutate.generic.commands.remove(query.ast, command2);

    const text2 = BasicPrettyPrinter.print(query.ast);

    expect(text2).toBe('FROM index | LIMIT 1 | LIMIT 2');
  });

  it('can insert a new WHERE command', () => {
    const src = 'FROM index | LIMIT 1';
    const query = EsqlQuery.fromSrc(src);
    const command = Builder.command({
      name: 'where',
      args: [
        Builder.expression.func.binary('==', [
          Builder.expression.column({
            args: [Builder.identifier({ name: 'a' })],
          }),
          Builder.expression.literal.numeric({
            value: 1,
            literalType: 'integer',
          }),
        ]),
      ],
    });

    mutate.generic.commands.insert(query.ast, command, 1);

    const text = BasicPrettyPrinter.print(query.ast);

    expect(text).toBe('FROM index | WHERE a == 1 | LIMIT 1');
  });

  it('can insert a new WHERE command with function call condition and param in column name', () => {
    const src = 'FROM index | LIMIT 1';
    const query = EsqlQuery.fromSrc(src);
    const command = Builder.command({
      name: 'where',
      args: [
        Builder.expression.func.binary('==', [
          Builder.expression.func.call('add', [
            Builder.expression.literal.integer(1),
            Builder.expression.literal.integer(2),
            Builder.expression.literal.integer(3),
          ]),
          Builder.expression.column({
            args: [
              Builder.identifier({ name: 'a' }),
              Builder.identifier({ name: 'b' }),
              Builder.param.build('?param'),
            ],
          }),
        ]),
      ],
    });

    mutate.generic.commands.insert(query.ast, command, 1);

    const text = BasicPrettyPrinter.print(query.ast);

    expect(text).toBe('FROM index | WHERE ADD(1, 2, 3) == a.b.?param | LIMIT 1');
  });

  it('can update WHERE command condition', () => {
    const src = 'FROM index | WHERE a /* important field */ == 1 | LIMIT 1';
    const query = EsqlQuery.fromSrc(src, { withFormatting: true });
    const [command] = mutate.commands.where.byField(query.ast, ['a'])!;
    const fn = command.args[0] as ESQLFunction;

    fn.args[1] = Builder.expression.literal.integer(2);

    const text = BasicPrettyPrinter.print(query.ast);

    expect(text).toBe('FROM index | WHERE a /* important field */ == 2 | LIMIT 1');
  });
});
