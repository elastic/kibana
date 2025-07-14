/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSortPos } from './utils';

test('returns correct position on complete modifier matches', () => {
  expect(getSortPos('from a | ')).toBe('none');
  expect(getSortPos('from a | s')).toBe('pre-start');
  expect(getSortPos('from a | so')).toBe('pre-start');
  expect(getSortPos('from a | sor')).toBe('pre-start');
  expect(getSortPos('from a | sort')).toBe('start');
  expect(getSortPos('from a | sort ')).toBe('expression');
  expect(getSortPos('from a | sort col')).toBe('expression');
  expect(getSortPos('from a | sort col + 23')).toBe('expression');
  expect(getSortPos('from a | sort col, ')).toBe('expression');
  expect(getSortPos('from a | sort col, col2')).toBe('expression');
  expect(getSortPos('from a | sort col, col2 ')).toBe('after_expression');
  expect(getSortPos('from a | sort col, FLOOR(col2) ')).toBe('after_expression');
  expect(getSortPos('from a | sort col ')).toBe('after_expression');
  expect(getSortPos('from a | sort col ASC')).toBe('order');
  expect(getSortPos('from a | sort col DESC ')).toBe('space3');
  expect(getSortPos('from a | sort col DESC NULLS FIRST')).toBe('nulls');
  expect(getSortPos('from a | sort col DESC NULLS LAST ')).toBe('space4');
  expect(getSortPos('from a | sort col DESC NULLS LAST, ')).toBe('space1');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2')).toBe('expression');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2 DESC')).toBe('order');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2 NULLS LAST')).toBe('nulls');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2 NULLS LAST ')).toBe('space4');
});

test('returns ASC/DESC matched text', () => {
  expect(getSortPos('from a | sort col ASC')).toBe('order');

  expect(getSortPos('from a | sort col as')).toBe('order');

  expect(getSortPos('from a | sort col DE')).toBe('order');
});

test('returns NULLS FIRST/NULLS LAST matched text', () => {
  expect(getSortPos('from a | sort col ASC NULLS FIRST')).toBe('nulls');
  expect(getSortPos('from a | sort col ASC NULLS FIRST').nulls).toBe('NULLS FIRST');

  expect(getSortPos('from a | sort col ASC nulls fi')).toBe('nulls');
  expect(getSortPos('from a | sort col ASC nulls fi').nulls).toBe('NULLS FI');

  expect(getSortPos('from a | sort col nul')).toBe('nulls');
  expect(getSortPos('from a | sort col nul').nulls).toBe('NUL');

  expect(getSortPos('from a | sort col1, col2 NULLS LA')).toBe('nulls');
  expect(getSortPos('from a | sort col1, col2 NULLS LA').nulls).toBe('NULLS LA');
});
