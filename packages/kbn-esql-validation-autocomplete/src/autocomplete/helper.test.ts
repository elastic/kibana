/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findMissingBrackets, fixupQuery } from './helper';
import { EDITOR_MARKER } from '../shared/constants';

describe('findMissingBrackets()', () => {
  test('returns the missing brackets in the right order', () => {
    expect(findMissingBrackets('(([([]').stack).toEqual([')', ')', ']', ')']);
    expect(findMissingBrackets('[([[(([[[((([]))').stack.join('')).toEqual('])]]))]]])');
  });

  test('can match the the brackets', () => {
    const samples = [
      ' ( 1 + (2) - [ (0) ] 0 ([[]',
      '(',
      '',
      '[',
      '([',
      '([()',
      '([()])',
      '((((((([[[[[',
      '()[]()[](([',
    ];

    for (const sample of samples) {
      const { stack } = findMissingBrackets(sample);
      const matched = stack.join('');
      expect(findMissingBrackets(matched).stack).toEqual([]);
    }
  });

  test('reports unmatched round bracket', () => {
    expect(findMissingBrackets('(([([]').roundCount > 0).toBe(true);
    expect(findMissingBrackets('(([([])]))[').roundCount > 0).toBe(false);
    expect(findMissingBrackets('(').roundCount > 0).toBe(true);
    expect(findMissingBrackets('()').roundCount > 0).toBe(false);
    expect(findMissingBrackets('()[').roundCount > 0).toBe(false);
    expect(findMissingBrackets('[]').roundCount > 0).toBe(false);
  });
});

describe('fixupQuery()', () => {
  test('adds missing brackets', () => {
    const query = 'FROM index | STATS a = avg(1 + ( ';
    const fixed = fixupQuery(query, query.length, { triggerKind: 0, triggerCharacter: ' ' });

    expect(fixed).toBe(query + '))');
  });

  test('adds missing round and square brackets', () => {
    const query = 'FROM index | STATS a = (1 in [1, (2 ';
    const fixed = fixupQuery(query, query.length, { triggerKind: 0, triggerCharacter: ' ' });

    expect(fixed).toBe(query + ')])');
  });

  test('inserts a marker', () => {
    const query = 'FROM index, ';
    const fixed = fixupQuery(query, query.length, { triggerKind: 0, triggerCharacter: ' ' });

    expect(fixed).toBe(query + EDITOR_MARKER);
  });
});
