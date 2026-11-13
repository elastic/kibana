/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { STEP_CHILD_CONTAINER_KEYS } from '@kbn/workflows';
import { isStructuralFragmentChange } from './is_structural_fragment_change';

/**
 * The canvas draws every place a step can hold child steps, and the one list of those places lives
 * in `@kbn/workflows`. A change to any of them must repaint at once, so the list is walked here and
 * a key added to it later is covered without touching this test.
 */
describe('isStructuralFragmentChange for every container the canvas draws', () => {
  it.each([...STEP_CHILD_CONTAINER_KEYS])('is structural when `%s` changes', (key) => {
    const before = `name: s\ntype: console\n${key}: one\n`;
    const after = `name: s\ntype: console\n${key}: two\n`;
    expect(isStructuralFragmentChange(before, after)).toBe(true);
  });

  it('is structural when a step inside a loop iteration fallback changes', () => {
    const before = `name: loop
type: foreach
foreach: "[1]"
iteration-on-failure:
  fallback:
    - name: recover
      type: console
      with: { message: a }
`;
    const after = before.replace('message: a', 'message: b');
    expect(isStructuralFragmentChange(before, after)).toBe(true);
  });

  it('is structural when a step is added to a step on-failure fallback', () => {
    const before = `name: s\ntype: console\non-failure:\n  fallback: []\n`;
    const after = `name: s\ntype: console\non-failure:\n  fallback:\n    - name: r\n      type: console\n`;
    expect(isStructuralFragmentChange(before, after)).toBe(true);
  });

  it('still lets a change of the step own settings wait', () => {
    const before = `name: s\ntype: console\nwith:\n  message: a\n`;
    const after = `name: s\ntype: console\nwith:\n  message: b\n`;
    expect(isStructuralFragmentChange(before, after)).toBe(false);
  });
});
