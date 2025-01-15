/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPosition } from './util';

test('returns correct position on complete modifier matches', () => {
  expect(getPosition('L', {} as any).pos).toBe('type');
  expect(getPosition('LE', {} as any).pos).toBe('type');
  expect(getPosition('LEFT', {} as any).pos).toBe('type');
  expect(getPosition('LEFT ', {} as any).pos).toBe('after_type');
  expect(getPosition('LEFT  ', {} as any).pos).toBe('after_type');
  expect(getPosition('LEFT  J', {} as any).pos).toBe('mnemonic');
  expect(getPosition('LEFT  JO', {} as any).pos).toBe('mnemonic');
  expect(getPosition('LEFT  JOI', {} as any).pos).toBe('mnemonic');
  expect(getPosition('LEFT  JOIN', {} as any).pos).toBe('mnemonic');
  expect(getPosition('LEFT  JOIN ', {} as any).pos).toBe('after_mnemonic');
  expect(getPosition('LEFT  JOIN  ', {} as any).pos).toBe('after_mnemonic');
  expect(getPosition('LEFT  JOIN  i', {} as any).pos).toBe('index');
  expect(getPosition('LEFT  JOIN  index', {} as any).pos).toBe('index');
  expect(getPosition('LEFT  JOIN  index ', {} as any).pos).toBe('after_index');
  expect(getPosition('LEFT  JOIN  index  ', {} as any).pos).toBe('after_index');
  expect(getPosition('LEFT  JOIN  index  A', {} as any).pos).toBe('as');
  expect(getPosition('LEFT  JOIN  index  AS', {} as any).pos).toBe('as');
  expect(getPosition('LEFT  JOIN  index  AS ', {} as any).pos).toBe('after_as');
  expect(getPosition('LEFT  JOIN  index  AS  ', {} as any).pos).toBe('after_as');
  expect(getPosition('LEFT  JOIN  index  AS a', {} as any).pos).toBe('alias');
  expect(getPosition('LEFT  JOIN  index  AS al', {} as any).pos).toBe('alias');
  expect(getPosition('LEFT  JOIN  index  AS alias', {} as any).pos).toBe('alias');
});
