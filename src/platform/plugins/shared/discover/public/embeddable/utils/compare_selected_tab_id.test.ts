/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareSelectedTabId } from './compare_selected_tab_id';

describe('compareSelectedTabId', () => {
  const defaultTabId = 'tab-1';

  it('should treat undefined and the default tab as equal', () => {
    expect(compareSelectedTabId(defaultTabId, undefined, 'tab-1')).toBe(true);
    expect(compareSelectedTabId(defaultTabId, 'tab-1', undefined)).toBe(true);
  });

  it('should treat both undefined as equal', () => {
    expect(compareSelectedTabId(defaultTabId, undefined, undefined)).toBe(true);
  });

  it('should treat identical explicit values as equal', () => {
    expect(compareSelectedTabId(defaultTabId, 'tab-2', 'tab-2')).toBe(true);
  });

  it('should detect a change to a non-default tab', () => {
    expect(compareSelectedTabId(defaultTabId, undefined, 'tab-2')).toBe(false);
    expect(compareSelectedTabId(defaultTabId, 'tab-1', 'tab-2')).toBe(false);
  });

  it('should detect a change from a non-default tab', () => {
    expect(compareSelectedTabId(defaultTabId, 'tab-2', undefined)).toBe(false);
    expect(compareSelectedTabId(defaultTabId, 'tab-2', 'tab-1')).toBe(false);
  });

  it('should handle undefined defaultTabId gracefully', () => {
    expect(compareSelectedTabId(undefined, undefined, undefined)).toBe(true);
    expect(compareSelectedTabId(undefined, 'tab-1', 'tab-1')).toBe(true);
    expect(compareSelectedTabId(undefined, 'tab-1', undefined)).toBe(false);
  });
});
