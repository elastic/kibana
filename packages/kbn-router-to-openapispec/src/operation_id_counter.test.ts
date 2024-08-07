/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createOperationIdCounter } from './operation_id_counter';

test('empty case', () => {
  const opIdCounter = createOperationIdCounter();
  expect(opIdCounter('')).toBe('#0');
});

test('other cases', () => {
  const opIdCounter = createOperationIdCounter();
  const tests = [
    ['/', '%2F#0'],
    ['/api/cool', '%2Fapi%2Fcool#0'],
    ['/api/cool', '%2Fapi%2Fcool#1'],
    ['/api/cool', '%2Fapi%2Fcool#2'],
    ['/api/cool/{variable}', '%2Fapi%2Fcool%2F%7Bvariable%7D#0'],
    ['/api/cool/{optionalVariable?}', '%2Fapi%2Fcool%2F%7BoptionalVariable%3F%7D#0'],
    ['/api/cool/{optionalVariable?}', '%2Fapi%2Fcool%2F%7BoptionalVariable%3F%7D#1'],
  ];

  tests.forEach(([input, expected]) => {
    expect(opIdCounter(input)).toBe(expected);
  });
});
