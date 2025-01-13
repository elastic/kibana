/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, Builder, synth } from '../../..';
import { SynthNode } from '../helpers';

test('synthesized nodes have SynthNodePrototype prototype', () => {
  const expression = synth.expr`?my_param`;
  const command = synth.cmd`LIMIT 123`;

  expect(expression).toBeInstanceOf(SynthNode);
  expect(command).toBeInstanceOf(SynthNode);
});

test('can cast expression to string', () => {
  const expression = synth.expr`?my_param`;

  expect(expression).toMatchObject({
    type: 'literal',
    literalType: 'param',
    paramType: 'named',
    value: 'my_param',
  });
  expect(String(expression)).toBe('?my_param');
});

test('can build the same expression with Builder', () => {
  const expression1 = synth.expr`my.field = max(10, ?my_param)`;
  const expression2 = Builder.expression.func.binary('=', [
    Builder.expression.column({
      args: [Builder.identifier({ name: 'my' }), Builder.identifier({ name: 'field' })],
    }),
    Builder.expression.func.call('max', [
      Builder.expression.literal.integer(10),
      Builder.param.named({ value: 'my_param' }),
    ]),
  ]);

  const expected = 'my.field = MAX(10, ?my_param)';

  expect(expression1 + '').toBe(expected);
  expect(BasicPrettyPrinter.expression(expression1)).toBe(expected);
  expect(BasicPrettyPrinter.expression(expression2)).toBe(expected);
});
