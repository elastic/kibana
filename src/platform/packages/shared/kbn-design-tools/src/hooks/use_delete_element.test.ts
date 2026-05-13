/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useDeleteElement } from './use_delete_element';
import { DEVTOOL_HIDDEN_ATTR, DEVELOPER_TOOLBAR_ID } from '../lib/constants';

describe('useDeleteElement', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('soft-deletes an element by hiding it', () => {
    const onDelete = jest.fn();
    const { result } = renderHook(() => useDeleteElement(onDelete));
    const el = document.createElement('div');
    document.body.appendChild(el);

    act(() => {
      result.current.deleteElement(el);
    });

    expect(el.getAttribute(DEVTOOL_HIDDEN_ATTR)).toBe('');
    expect(el.style.pointerEvents).toBe('none');
    expect(onDelete).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(el.style.visibility).toBe('hidden');
    el.remove();
  });

  it('preserves original transform in the hidden attribute', () => {
    const { result } = renderHook(() => useDeleteElement());
    const el = document.createElement('div');
    el.style.transform = 'translateX(10px)';
    document.body.appendChild(el);

    act(() => {
      result.current.deleteElement(el);
    });

    expect(el.getAttribute(DEVTOOL_HIDDEN_ATTR)).toBe('translateX(10px)');
    el.remove();
  });

  it('refuses to delete BODY and HTML elements', () => {
    const { result } = renderHook(() => useDeleteElement());
    const body = document.body;

    act(() => {
      result.current.deleteElement(body);
    });

    expect(body.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
  });

  it('refuses to delete elements containing the developer toolbar', () => {
    const { result } = renderHook(() => useDeleteElement());
    const wrapper = document.createElement('div');
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;
    wrapper.appendChild(toolbar);
    document.body.appendChild(wrapper);

    act(() => {
      result.current.deleteElement(wrapper);
    });

    expect(wrapper.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
    wrapper.remove();
  });

  it('restoreAll restores all deleted elements', () => {
    const { result } = renderHook(() => useDeleteElement());
    const el1 = document.createElement('div');
    el1.style.transform = 'scale(2)';
    const el2 = document.createElement('div');
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    act(() => {
      result.current.deleteElement(el1);
      result.current.deleteElement(el2);
      jest.advanceTimersByTime(200);
    });

    expect(el1.style.visibility).toBe('hidden');
    expect(el2.style.visibility).toBe('hidden');

    act(() => {
      result.current.restoreAll();
    });

    expect(el1.style.visibility).toBe('');
    expect(el1.style.pointerEvents).toBe('');
    expect(el1.style.transform).toBe('scale(2)');
    expect(el1.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
    expect(el2.style.visibility).toBe('');

    el1.remove();
    el2.remove();
  });

  it('tracks deleted count', () => {
    const { result } = renderHook(() => useDeleteElement());
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(result.current.deletedCount()).toBe(0);

    act(() => {
      result.current.deleteElement(el);
    });

    expect(result.current.deletedCount()).toBe(1);

    act(() => {
      result.current.restoreAll();
    });

    expect(result.current.deletedCount()).toBe(0);
    el.remove();
  });
});
