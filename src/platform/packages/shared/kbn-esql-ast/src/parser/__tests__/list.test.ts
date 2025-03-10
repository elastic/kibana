/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('List Expression', () => {
  it('number list', () => {
    const text = 'ROW [1, 2, 3]';
    const { root } = parse(text);

    expect(root.commands[0].args[0]).toMatchObject({
      type: 'list',
      values: [
        {
          type: 'literal',
          value: 1,
        },
        {
          type: 'literal',
          value: 2,
        },
        {
          type: 'literal',
          value: 3,
        },
      ],
    });
  });

  it('single null list', () => {
    const text = 'ROW NULL';
    const { root } = parse(text);

    expect(root.commands[0].args[0]).toMatchObject({
      type: 'literal',
      literalType: 'null',
    });
  });
});
