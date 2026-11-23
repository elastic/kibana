/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { useFullScreen } from './use_fullscreen';

describe('useFullScreen', () => {
  it('should toggle fullscreen', () => {
    const { result } = renderHook(() => useFullScreen({ allowFullScreen: true }));

    act(() => {
      result.current.setIsFullScreen(true);
    });

    expect(result.current.isFullScreen).toBe(true);
  });

  it('will not set fullscreen on keydown if not in fullscreen', () => {
    const { result } = renderHook(() => useFullScreen({ allowFullScreen: true }));

    render(
      <div data-test-subj="fullscreen-escape-key-down" onKeyDown={result.current.onKeyDown} />
    );

    fireEvent.keyDown(screen.getByTestId('fullscreen-escape-key-down'), { key: 'Escape' });

    expect(result.current.isFullScreen).toBe(false);
  });
});
