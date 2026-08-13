/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeEsqlColumnName } from './columns';

describe('escapeEsqlColumnName', () => {
  it.each([
    {
      name: 'leaves a valid column path unchanged',
      input: 'host.name',
      expected: 'host.name',
    },
    {
      name: 'quotes a numeric segment at the end',
      input: 'system.cpu.load_average.1',
      expected: 'system.cpu.load_average.`1`',
    },
    {
      name: 'quotes a numeric segment in the middle',
      input: 'system.1.load_average',
      expected: 'system.`1`.load_average',
    },
    {
      name: 'quotes a reserved boolean literal',
      input: 'my.field.true',
      expected: 'my.field.`true`',
    },
    {
      name: 'quotes a segment containing a hyphen',
      input: 'host.cpu-load.value',
      expected: 'host.`cpu-load`.value',
    },
  ])('$name', ({ input, expected }) => {
    expect(escapeEsqlColumnName(input)).toBe(expected);
  });

  it('does not double existing backticks', () => {
    expect(escapeEsqlColumnName('system.cpu.load_average.`1`')).toBe('system.cpu.load_average.`1`');
  });
});
