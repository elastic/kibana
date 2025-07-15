/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@kbn/esql-ast';
import { getEnrichCommands } from './helpers';

describe('getEnrichCommands', () => {
  test('should return the command in case of an enrich command', async () => {
    const { root } = Parser.parse('FROM index | ENRICH policy ON field');
    expect(getEnrichCommands(root.commands).length).toBe(1);
  });

  test('should return empty array if enrich is not present', async () => {
    const { root } = Parser.parse('FROM index | STATS COUNT() BY field');
    expect(getEnrichCommands(root.commands)).toStrictEqual([]);
  });

  test('should return the command in case of an enrich command inside a fork branch', async () => {
    const { root } = Parser.parse(
      'FROM index | FORK (ENRICH policy ON @timestamp WITH col0 = bikes_count) (DROP @timestamp) '
    );
    expect(getEnrichCommands(root.commands).length).toBe(1);
  });

  test('should return empty array in case of forck branches without enrich', async () => {
    const { root } = Parser.parse('FROM index | FORK (STATS COUNT()) (DROP @timestamp) ');
    expect(getEnrichCommands(root.commands)).toStrictEqual([]);
  });
});
