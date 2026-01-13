/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '../../../..';
import { synth } from '../../../..';
import type { SortPosition } from './utils';
import { getSortPos as _getSortPos } from './utils';

export const getSortPos = (query: string) => {
  const commandText = query.split('|').pop()?.trim() || '';
  if (!commandText.startsWith('sort')) {
    throw new Error(`Expected 'sort' command, but got: ${commandText}`);
  }

  const command: ESQLCommand = synth.cmd(commandText);
  return _getSortPos(query, command).position;
};

test('returns correct position on complete modifier matches', () => {
  expect(getSortPos('from a | sort col')).toBe<SortPosition>('expression');
  expect(getSortPos('from a | sort col ')).toBe<SortPosition>('expression');
  expect(getSortPos('from a | sort col IS NOT NULL')).toBe<SortPosition>('expression');
  expect(getSortPos('from a | sort E()')).toBe<SortPosition>('expression');
  expect(getSortPos('from a | sort E() ')).toBe<SortPosition>('expression');

  expect(getSortPos('from a | sort col ASC')).toBe<SortPosition>('order_complete');
  expect(getSortPos('from a | sort col DESC')).toBe<SortPosition>('order_complete');

  expect(getSortPos('from a | sort col ASC ')).toBe<SortPosition>('after_order');
  expect(getSortPos('from a | sort col DESC ')).toBe<SortPosition>('after_order');

  expect(getSortPos('from a | sort col NULLS FIRST')).toBe<SortPosition>('nulls_complete');
  expect(getSortPos('from a | sort col NULLS LAST')).toBe<SortPosition>('nulls_complete');

  expect(getSortPos('from a | sort col NULLS FIRST ')).toBe<SortPosition>('after_nulls');
  expect(getSortPos('from a | sort col NULLS LAST ')).toBe<SortPosition>('after_nulls');

  expect(getSortPos('from a | sort col ASC NULLS FIRST')).toBe<SortPosition>('nulls_complete');
  expect(getSortPos('from a | sort col DESC NULLS LAST')).toBe<SortPosition>('nulls_complete');

  expect(getSortPos('from a | sort col ASC NULLS FIRST ')).toBe<SortPosition>('after_nulls');
  expect(getSortPos('from a | sort col DESC NULLS LAST ')).toBe<SortPosition>('after_nulls');
});
