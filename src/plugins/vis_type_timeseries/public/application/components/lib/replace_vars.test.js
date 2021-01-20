/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { replaceVars } from './replace_vars';

describe('replaceVars(str, args, vars)', () => {
  test('replaces vars with values', () => {
    const vars = { total: 100 };
    const args = { host: 'test-01' };
    const template = '# {{args.host}} {{total}}';
    expect(replaceVars(template, args, vars)).toEqual('# test-01 100');
  });
  test('replaces args override vars', () => {
    const vars = { total: 100, args: { test: 'foo-01' } };
    const args = { test: 'bar-01' };
    const template = '# {{args.test}} {{total}}';
    expect(replaceVars(template, args, vars)).toEqual('# bar-01 100');
  });
  test('returns original string if error', () => {
    const vars = { total: 100 };
    const args = { host: 'test-01' };
    const template = '# {{args.host}} {{total';
    expect(replaceVars(template, args, vars)).toEqual('# {{args.host}} {{total');
  });
});
