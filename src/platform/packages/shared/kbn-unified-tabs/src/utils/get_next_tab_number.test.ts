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

const COPY_REGEX = /^Untitled\s*\(copy\)( (\d+))?$/;
const TAB_REGEX = /^Untitled( (\d+))?$/;

describe('getNextTabNumber', () => {
  it('should return null when no tabs match the regex pattern', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Some tab' },
      { id: '2', label: 'Another tab' },
      { id: '3', label: 'Different label' },
    ];

    const result = getNextTabNumber(tabs, COPY_REGEX);

    expect(result).toBeNull();
  });

  it('should work with regular numbered tabs (non-copy scenario)', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled 2' },
      { id: '3', label: 'Untitled 4' },
      { id: '4', label: 'Some other tab' },
    ];

    const result = getNextTabNumber(tabs, TAB_REGEX);

    expect(result).toBe(5); // Should be max(1, 2, 4) + 1 = 5
  });

  it('should return 2 when there is one copy tab without a number', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled (copy)' },
      { id: '3', label: 'Some other tab' },
    ];

    const result = getNextTabNumber(tabs, COPY_REGEX);

    expect(result).toBe(2);
  });

  it('should return the next number when multiple numbered copy tabs exist', () => {
    const tabs: TabItem[] = [
      { id: '1', label: 'Untitled' },
      { id: '2', label: 'Untitled (copy)' },
      { id: '3', label: 'Untitled (copy) 2' },
      { id: '4', label: 'Untitled (copy) 5' },
      { id: '5', label: 'Some other tab' },
    ];

    const result = getNextTabNumber(tabs, COPY_REGEX);

    expect(result).toBe(6); // Should be max(1, 2, 5) + 1 = 6
  });
});
