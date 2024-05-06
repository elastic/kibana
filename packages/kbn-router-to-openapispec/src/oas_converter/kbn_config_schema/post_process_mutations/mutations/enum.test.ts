/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { joi2JsonInternal } from '../../parse';
import { processLiteralEnum } from './enum';

const literalEnum = schema.oneOf([schema.literal('foo'), schema.literal('bar')], {
  meta: { literalEnum: true, description: 'test' },
});

test('handles literal enums', () => {
  const parsed = joi2JsonInternal(literalEnum.getSchema());
  processLiteralEnum(parsed);
  expect(parsed).toEqual({
    type: 'string',
    enum: ['foo', 'bar'],
    description: 'test',
  });
});

const notLiteralEnum = schema.oneOf([schema.literal('foo'), schema.literal('bar')], {
  meta: { description: 'test' },
});

test('ignores non literal enums values', () => {
  const parsed = joi2JsonInternal(notLiteralEnum.getSchema());
  processLiteralEnum(parsed);
  expect(parsed).toEqual({
    anyOf: [
      { type: 'string', enum: ['foo'] },
      { type: 'string', enum: ['bar'] },
    ],
    description: 'test',
  });
});
