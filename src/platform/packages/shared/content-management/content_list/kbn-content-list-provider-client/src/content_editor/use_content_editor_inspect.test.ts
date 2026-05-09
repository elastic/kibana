/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { useContentEditorInspect } from './use_content_editor_inspect';
import type { ContentEditorConfig } from './types';

const mockOpenContentEditor = jest.fn((_params: OpenContentEditorParams): (() => void) =>
  jest.fn()
);
const mockOnSave = jest.fn(async () => {});

jest.mock('@kbn/content-list-provider', () => {
  const actual = jest.requireActual('@kbn/content-list-provider');
  return {
    ...actual,
    contentListQueryClient: {
      invalidateQueries: jest.fn(),
    },
  };
});

const defaultConfig: ContentEditorConfig = {
  openContentEditor: mockOpenContentEditor,
  onSave: mockOnSave,
  isReadonly: false,
};

const defaultOptions = {
  entityName: 'dashboard',
  isReadOnly: false,
  queryKeyScope: 'test-listing',
};

const testItem = {
  id: '1',
  title: 'My Dashboard',
  description: 'A test dashboard',
  tags: ['tag-1', 'tag-2'],
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedAt: new Date('2024-06-15T12:00:00Z'),
  updatedBy: 'user-2',
  managed: false,
};

describe('useContentEditorInspect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when contentEditor is not provided', () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: undefined })
    );

    expect(result.current).toBeUndefined();
  });

  it('returns a callback when contentEditor is provided', () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: defaultConfig })
    );

    expect(result.current).toBeInstanceOf(Function);
  });

  it('calls openContentEditor with transformed item', () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: defaultConfig })
    );

    act(() => {
      result.current!(testItem);
    });

    expect(mockOpenContentEditor).toHaveBeenCalledTimes(1);
    const callArgs = mockOpenContentEditor.mock.calls[0][0];

    expect(callArgs.item).toMatchObject({
      id: '1',
      title: 'My Dashboard',
      description: 'A test dashboard',
      tags: ['tag-1', 'tag-2'],
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'user-1',
      updatedAt: '2024-06-15T12:00:00.000Z',
      updatedBy: 'user-2',
      managed: false,
    });
    expect(callArgs.entityName).toBe('dashboard');
    expect(callArgs.isReadonly).toBe(false);
  });

  it('forces read-only mode for managed items', () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: defaultConfig })
    );

    act(() => {
      result.current!({ ...testItem, managed: true });
    });

    const callArgs = mockOpenContentEditor.mock.calls[0][0];
    expect(callArgs.isReadonly).toBe(true);
    expect(callArgs.readonlyReason).toBeDefined();
    expect(callArgs.onSave).toBeUndefined();
  });

  it('wraps onSave with query invalidation', async () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: defaultConfig })
    );

    act(() => {
      result.current!(testItem);
    });

    const callArgs = mockOpenContentEditor.mock.calls[0][0];
    expect(callArgs.onSave).toBeDefined();

    await act(async () => {
      await callArgs.onSave!({ id: '1', title: 'Updated', tags: ['tag-1'] });
    });

    expect(mockOnSave).toHaveBeenCalledWith({ id: '1', title: 'Updated', tags: ['tag-1'] });
    expect(contentListQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['content-list', 'test-listing'],
    });
  });

  it('handles items with no tags', () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: defaultConfig })
    );

    act(() => {
      result.current!({ id: '2', title: 'No Tags' });
    });

    const callArgs = mockOpenContentEditor.mock.calls[0][0];
    expect(callArgs.item.tags).toEqual([]);
  });

  it('does not suppress onSave for non-managed items when isReadonly is false', () => {
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: defaultConfig })
    );

    act(() => {
      result.current!(testItem);
    });

    const callArgs = mockOpenContentEditor.mock.calls[0][0];
    expect(callArgs.isReadonly).toBe(false);
    expect(callArgs.onSave).toBeDefined();
  });

  it('defaults to read-only when isReadonly is not explicitly set to false', () => {
    const viewOnlyConfig: ContentEditorConfig = {
      openContentEditor: mockOpenContentEditor,
      onSave: mockOnSave,
      // isReadonly intentionally omitted — should default to read-only
    };
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: viewOnlyConfig })
    );

    act(() => {
      result.current!(testItem);
    });

    const callArgs = mockOpenContentEditor.mock.calls[0][0];
    expect(callArgs.isReadonly).toBe(true);
    expect(callArgs.onSave).toBeUndefined();
  });

  it('defaults to read-only when onSave is not provided', () => {
    const noSaveConfig: ContentEditorConfig = {
      openContentEditor: mockOpenContentEditor,
      isReadonly: false,
      // onSave intentionally omitted — should force read-only
    };
    const { result } = renderHook(() =>
      useContentEditorInspect({ ...defaultOptions, contentEditor: noSaveConfig })
    );

    act(() => {
      result.current!(testItem);
    });

    const callArgs = mockOpenContentEditor.mock.calls[0][0];
    expect(callArgs.isReadonly).toBe(true);
    expect(callArgs.onSave).toBeUndefined();
  });
});
