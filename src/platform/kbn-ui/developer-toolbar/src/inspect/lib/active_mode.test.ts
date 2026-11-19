/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import {
  deactivateMode,
  getActiveMode,
  setActiveMode,
  toggleActiveMode,
  useActiveMode,
} from './active_mode';

describe('active_mode', () => {
  beforeEach(() => {
    setActiveMode(null);
  });

  it('should toggle a mode on and off', () => {
    toggleActiveMode('grab');
    expect(getActiveMode()).toBe('grab');

    toggleActiveMode('grab');
    expect(getActiveMode()).toBeNull();
  });

  it('should replace the active mode when another one is toggled on', () => {
    toggleActiveMode('inspect');
    toggleActiveMode('grab');

    expect(getActiveMode()).toBe('grab');
  });

  it('should only deactivate the mode that is still active', () => {
    setActiveMode('grab');

    deactivateMode('inspect');
    expect(getActiveMode()).toBe('grab');

    deactivateMode('grab');
    expect(getActiveMode()).toBeNull();
  });

  it('should re-render subscribers when the active mode changes', () => {
    const { result } = renderHook(() => useActiveMode());

    expect(result.current).toBeNull();

    act(() => toggleActiveMode('inspect'));

    expect(result.current).toBe('inspect');
  });
});
