/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDiscardFlagActive, isDiscardFlagMismatched } from './discard_flag';

describe('discard flag', () => {
  it.each`
    flag         | active   | mismatched
    ${undefined} | ${false} | ${false}
    ${false}     | ${false} | ${false}
    ${true}      | ${true}  | ${false}
    ${'9.7.0'}   | ${true}  | ${false}
    ${'9.6.0'}   | ${false} | ${true}
  `(
    'flag=$flag on 9.7.0 is active=$active, mismatched=$mismatched',
    ({ flag, active, mismatched }) => {
      expect(isDiscardFlagActive(flag, '9.7.0')).toBe(active);
      expect(isDiscardFlagMismatched(flag, '9.7.0')).toBe(mismatched);
    }
  );
});
