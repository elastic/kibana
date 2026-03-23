/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNextTabNumber } from './get_next_tab_number';
import type { TabItem } from '../types';

const DEFAULT_TAB_LABEL = 'Untitled';
const DEFAULT_TAB_COPY_LABEL = 'Untitled (copy)';

describe('getNextNumber', () => {
  it('should return null when no tabs match the base label pattern', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Some tab' },
      { id: '2', label: 'Another tab' },
      { id: '3', label: 'Different label' },
    ];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);

    expect(result).toBeNull();
  });

  it('should work with regular numbered tabs (non-copy scenario)', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled 2' },
      { id: '3', label: 'Untitled 4' },
      { id: '4', label: 'Some other tab' },
    ];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);

    expect(result).toBe(5); // Should be max(1, 2, 4) + 1 = 5
  });

  it('should return 2 when there is one copy tab without a number', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled (copy)' },
      { id: '3', label: 'Some other tab' },
    ];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_COPY_LABEL);

    expect(result).toBe(2); // "Untitled (copy)" is treated as number 1
  });

  it('should return the next number when multiple numbered copy tabs exist', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled (copy)' },
      { id: '3', label: 'Untitled (copy) 2' },
      { id: '4', label: 'Untitled (copy) 5' },
      { id: '5', label: 'Some other tab' },
    ];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_COPY_LABEL);

    expect(result).toBe(6); // Should be max(1, 2, 5) + 1 = 6
  });

  it('should count copy and regular tabs separately', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled 3' },
      { id: '2', label: 'Untitled (copy) 2' },
      { id: '3', label: 'Some other tab' },
    ];

    const nextCopyNumber = getNextTabNumber(tabs, DEFAULT_TAB_COPY_LABEL);
    expect(nextCopyNumber).toBe(3);

    const nextTabNumber = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);
    expect(nextTabNumber).toBe(4);
  });

  it('should handle tabs with whitespace correctly', () => {
    const tabs: TabItem[] = [
      { id: '1', label: '  Untitled  ' },
      { id: '2', label: 'Untitled 2  ' },
      { id: '3', label: '  Untitled 3' },
    ];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);

    expect(result).toBe(4); // Should be max(1, 2, 3) + 1 = 4
  });

  it('should handle case with only base label', () => {
    const tabs: TabItem[] = [{ id: '1', label: 'Untitled' }];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);

    expect(result).toBe(2); // "Untitled" is treated as number 1, so next is 2
  });

  it('should ignore differently named tabs', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled abc 4' }, // Invalid - should be ignored
      { id: '3', label: 'Untitled 2' },
      { id: '4', label: 'Untitled extra text 2' }, // Invalid - should be ignored
    ];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);

    expect(result).toBe(3); // Should be max(1, 2) + 1 = 3
  });

  it('should work with complex base labels containing special characters', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'My Tab (special/?)' },
      { id: '2', label: 'My Tab (special*) 2' },
      { id: '3', label: 'My Tab (^special) 5' },
    ];

    const result = getNextTabNumber(tabs, 'My Tab (special/?)');

    expect(result).toBe(2);
  });

  it('should handle empty tabs array', () => {
    const tabs: TabItem[] = [];

    const result = getNextTabNumber(tabs, DEFAULT_TAB_LABEL);

    expect(result).toBeNull();
  });
});
