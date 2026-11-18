/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { parseDocument } from 'yaml';
import { useStepFragment } from './use_step_fragment';

jest.mock('yaml', () => {
  const actual = jest.requireActual('yaml');
  return { ...actual, parseDocument: jest.fn((...args) => actual.parseDocument(...args)) };
});

const parses = () => (parseDocument as unknown as jest.Mock).mock.calls.length;

describe('useStepFragment', () => {
  beforeEach(() => (parseDocument as unknown as jest.Mock).mockClear());

  it('parses the text it is given', () => {
    const { result } = renderHook(() => useStepFragment('name: a\ntype: x\n'));
    expect(result.current.valid).toBe(true);
    expect(result.current.read(['name'])).toBe('a');
  });

  it('parses once however often it renders with the same text', () => {
    const { result, rerender } = renderHook(({ text }) => useStepFragment(text), {
      initialProps: { text: 'name: a\n' },
    });
    const first = result.current;
    rerender({ text: 'name: a\n' });
    rerender({ text: 'name: a\n' });
    expect(result.current).toBe(first);
    expect(parses()).toBe(1);
  });

  it('parses again when the text changes', () => {
    const { result, rerender } = renderHook(({ text }) => useStepFragment(text), {
      initialProps: { text: 'name: a\n' },
    });
    rerender({ text: 'name: b\n' });
    expect(result.current.read(['name'])).toBe('b');
    expect(parses()).toBe(2);
  });
});
