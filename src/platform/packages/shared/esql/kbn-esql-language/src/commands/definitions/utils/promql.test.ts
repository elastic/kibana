/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { ESQLAstPromqlCommand } from '@elastic/esql/types';
import { getIndexFromPromQLParams } from './promql';

const getIndex = (indexParam: string) => {
  const { root } = Parser.parse(
    `PROMQL ${indexParam} step=1m start=?_tstart end=?_tend (avg(cpu))`
  );
  return getIndexFromPromQLParams(root.commands[0] as ESQLAstPromqlCommand);
};

describe('getIndexFromPromQLParams', () => {
  it('returns an unquoted index', () => {
    expect(getIndex('index=metrics-a')).toBe('metrics-a');
  });

  it('joins an unquoted index list', () => {
    expect(getIndex('index=metrics-a,metrics-b')).toBe('metrics-a,metrics-b');
  });

  it('removes the quotes of a quoted index', () => {
    expect(getIndex('index="metrics-a"')).toBe('metrics-a');
  });

  it('removes the quotes of a quoted index list', () => {
    expect(getIndex('index="metrics-a","metrics-b"')).toBe('metrics-a,metrics-b');
  });
});
