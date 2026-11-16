/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { opensPickerOnAt } from './opens_picker_on_at';

describe('opensPickerOnAt', () => {
  it.each([
    ['esql', false],
    ['json', false],
    ['json-liquid', false],
    ['kuery', true],
    ['plaintext', true],
    [undefined, true],
  ])('for %s is %s', (language, expected) => {
    expect(opensPickerOnAt(language)).toBe(expected);
  });
});
