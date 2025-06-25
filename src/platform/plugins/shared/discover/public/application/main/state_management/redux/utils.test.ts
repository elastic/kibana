/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTabItem } from './utils';
import { type TabState } from './types';
import { defaultTabState } from './internal_state';

const createMockTabState = (id: string, label: string): TabState => ({
  ...defaultTabState,
  id,
  label,
});

describe('createTabItem', () => {
  it('should create a tab with default label when no tabs exist', () => {
    const result = createTabItem([]);
    expect(result.label).toBe('Untitled');
  });

  it('should create a tab with default label when no tabs with default label exist', () => {
    const tabs = [
      createMockTabState('tab1', 'Custom Label'),
      createMockTabState('tab2', 'Another Tab'),
    ];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled');
  });

  it('should create a tab with number 2 when one default tab exists', () => {
    const tabs = [createMockTabState('tab1', 'Untitled')];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled 2');
  });

  it('should create a tab with incremented number when multiple default tabs exist', () => {
    const tabs = [
      createMockTabState('tab1', 'Untitled'),
      createMockTabState('tab2', 'Untitled 2'),
      createMockTabState('tab3', 'Untitled 5'),
    ];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled 6');
  });

  it('should ignore non-matching tab labels', () => {
    const tabs = [
      createMockTabState('tab1', 'Untitled'),
      createMockTabState('tab2', 'Almost Untitled 2'), // This shouldn't match
      createMockTabState('tab3', 'UntitledX'), // This shouldn't match
    ];

    const result = createTabItem(tabs);
    expect(result.label).toBe('Untitled 2');
  });
});
