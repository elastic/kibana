/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useTruncateText } from './use_truncate_text';

describe('useTruncateText', () => {
  const shortText = 'Short text';
  const longText = 'A'.repeat(600);

  test('should not truncate text shorter than maxLength', () => {
    const { result } = renderHook(() => useTruncateText(shortText));

    expect(result.current.displayText).toBe(shortText);
    expect(result.current.shouldTruncate).toBe(false);
    expect(result.current.isExpanded).toBe(false);
  });

  test('should truncate text longer than maxLength', () => {
    const { result } = renderHook(() => useTruncateText(longText));

    expect(result.current.displayText).toBe(`${'A'.repeat(500)}...`);
    expect(result.current.shouldTruncate).toBe(true);
    expect(result.current.isExpanded).toBe(false);
  });

  test('should respect custom maxLength', () => {
    const customMaxLength = 200;
    const { result } = renderHook(() => useTruncateText(longText, customMaxLength));

    expect(result.current.displayText).toBe(`${'A'.repeat(200)}...`);
    expect(result.current.shouldTruncate).toBe(true);
  });

  test('should respect custom maxCharLength', () => {
    const customMaxLength = 300;
    const customMaxCharLength = 100;
    const { result } = renderHook(() =>
      useTruncateText(longText, customMaxLength, customMaxCharLength)
    );

    expect(result.current.displayText).toBe(`${'A'.repeat(100)}...`);
    expect(result.current.shouldTruncate).toBe(true);
  });

  test('should show full text when expanded', () => {
    const { result } = renderHook(() => useTruncateText(longText));

    expect(result.current.displayText).toBe(`${'A'.repeat(500)}...`);

    act(() => {
      result.current.toggleExpanded();
    });

    expect(result.current.isExpanded).toBe(true);
    expect(result.current.displayText).toBe(longText);
  });

  test('should toggle expanded state', () => {
    const { result } = renderHook(() => useTruncateText(longText));

    expect(result.current.isExpanded).toBe(false);

    act(() => {
      result.current.toggleExpanded();
    });

    expect(result.current.isExpanded).toBe(true);

    act(() => {
      result.current.toggleExpanded();
    });

    expect(result.current.isExpanded).toBe(false);
  });

  test('should handle null or undefined text', () => {
    const { result } = renderHook(() => useTruncateText(null as unknown as string));

    expect(result.current.displayText).toBe(null);
    expect(result.current.shouldTruncate).toBe(false);
  });
});
