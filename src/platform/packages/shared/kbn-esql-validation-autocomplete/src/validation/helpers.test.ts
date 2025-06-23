/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@kbn/esql-ast';
import { hasEnrichCommand } from './helpers';

describe('hasEnrichCommand', () => {
  test('should return true in case of an enrich command', async () => {
    const { root } = Parser.parse('FROM index | ENRICH policy ON field');
    expect(hasEnrichCommand(root.commands)).toBe(true);
  });

  test('should return false if enrich is not present', async () => {
    const { root } = Parser.parse('FROM index | STATS COUNT() BY field');
    expect(hasEnrichCommand(root.commands)).toBe(false);
  });

  test('should return true in case of an enrich command inside a fork branch', async () => {
    const { root } = Parser.parse(
      'FROM index | FORK (ENRICH policy ON @timestamp WITH col0 = bikes_count) (DROP @timestamp) '
    );
    expect(hasEnrichCommand(root.commands)).toBe(true);
  });

  test('should return false in case of forck branches without enrich', async () => {
    const { root } = Parser.parse('FROM index | FORK (STATS COUNT()) (DROP @timestamp) ');
    expect(hasEnrichCommand(root.commands)).toBe(false);
  });
});
