/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '../../../..';
import { SortPosition, getSortPos } from './utils';

const getPos = (query: string) => {
  const command = query.split('|')[1];
  return getSortPos(query, synth.cmd(command.trim()));
};

test('returns correct position on complete modifier matches', () => {
  expect(getPos('from a | sort')).toBe<SortPosition>('empty_expression');
  expect(getPos('from a | sort ')).toBe<SortPosition>('empty_expression');
  expect(getPos('from a | sort col')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col + 23')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col, ')).toBe<SortPosition>('empty_expression');
  expect(getPos('from a | sort col, col2')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col, col2 ')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col, FLOOR(col2) ')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col ')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col ASC')).toBe<SortPosition>('order_complete');
  expect(getPos('from a | sort col DESC ')).toBe<SortPosition>('after_order');
  expect(getPos('from a | sort col DESC NULLS FIRST')).toBe<SortPosition>('nulls_complete');
  expect(getPos('from a | sort col DESC NULLS LAST ')).toBe<SortPosition>('after_nulls');
  expect(getPos('from a | sort col DESC NULLS LAST, ')).toBe<SortPosition>('empty_expression');
  expect(getPos('from a | sort col DESC NULLS LAST, col2')).toBe<SortPosition>('expression');
  expect(getPos('from a | sort col DESC NULLS LAST, col2 DESC')).toBe<SortPosition>(
    'order_complete'
  );
  expect(getPos('from a | sort col DESC NULLS LAST, col2 NULLS LAST')).toBe<SortPosition>(
    'nulls_complete'
  );
  expect(getPos('from a | sort col DESC NULLS LAST, col2 NULLS LAST ')).toBe<SortPosition>(
    'after_nulls'
  );
});

test('returns ASC/DESC matched text', () => {
  expect(getPos('from a | sort col ASC')).toBe<SortPosition>('order_complete');

  expect(getPos('from a | sort col as')).toBe<SortPosition>('expression');

  expect(getPos('from a | sort col DE')).toBe<SortPosition>('expression');
});
