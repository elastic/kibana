/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useOpenContentEditor } from './use_content_editor_action';
import type { ContentListItem } from '../../item';
import type { ContentEditorConfig } from './types';

// Mock the context hooks.
const mockFeatures: { contentEditor?: boolean | ContentEditorConfig } = {};
const mockSupports = { contentEditor: false };
const mockRefetch = jest.fn();
const mockOpenContentEditor = jest.fn();

jest.mock('../../context', () => ({
  useContentListConfig: () => ({
    features: mockFeatures,
    supports: mockSupports,
    entityName: 'dashboard',
  }),
}));

jest.mock('../../state', () => ({
  useContentListItems: () => ({
    refetch: mockRefetch,
  }),
}));

jest.mock('./content_editor_action_context', () => ({
  useContentEditorOpener: () => mockOpenContentEditor,
}));

describe('useOpenContentEditor', () => {
  const createMockItem = (overrides?: Partial<ContentListItem>): ContentListItem => ({
    id: 'item-1',
    title: 'Test Dashboard',
    description: 'A test dashboard',
    type: 'dashboard',
    tags: ['tag-1', 'tag-2'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    createdBy: 'user-1',
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    updatedBy: 'user-2',
    isManaged: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatures.contentEditor = undefined;
    mockSupports.contentEditor = false;
  });

  describe('when content editor is not supported', () => {
    it('should return undefined when supports.contentEditor is false', () => {
      mockSupports.contentEditor = false;
      mockFeatures.contentEditor = { onSave: jest.fn() };

      const { result } = renderHook(() => useOpenContentEditor());

      expect(result.current).toBeUndefined();
    });
  });

  describe('when content editor is not configured', () => {
    it('should return undefined when features.contentEditor is undefined', () => {
      mockSupports.contentEditor = true;
      mockFeatures.contentEditor = undefined;

      const { result } = renderHook(() => useOpenContentEditor());

      expect(result.current).toBeUndefined();
    });

    it('should return undefined when features.contentEditor is boolean true', () => {
      mockSupports.contentEditor = true;
      mockFeatures.contentEditor = true;

      const { result } = renderHook(() => useOpenContentEditor());

      expect(result.current).toBeUndefined();
    });
  });

  describe('when content editor is fully configured', () => {
    const mockOnSave = jest.fn();
    const mockClose = jest.fn();

    beforeEach(() => {
      mockSupports.contentEditor = true;
      mockFeatures.contentEditor = { onSave: mockOnSave };
      mockOpenContentEditor.mockReturnValue(mockClose);
    });

    it('should return a handler function', () => {
      const { result } = renderHook(() => useOpenContentEditor());

      expect(typeof result.current).toBe('function');
    });

    it('should call openContentEditor with correct item data', () => {
      const item = createMockItem();

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({
            id: 'item-1',
            title: 'Test Dashboard',
            description: 'A test dashboard',
            managed: false,
          }),
          entityName: 'dashboard',
          isReadonly: false,
        })
      );
    });

    it('should convert tags to SavedObjectsReference format', () => {
      const item = createMockItem({ tags: ['tag-1', 'tag-2'] });

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({
            tags: [
              { type: 'tag', id: 'tag-1', name: 'tag-tag-1' },
              { type: 'tag', id: 'tag-2', name: 'tag-tag-2' },
            ],
          }),
        })
      );
    });

    it('should convert dates to ISO strings', () => {
      const item = createMockItem({
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T00:00:00Z'),
      });

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-15T00:00:00.000Z',
          }),
        })
      );
    });

    it('should use isManaged as default for isReadonly', () => {
      const managedItem = createMockItem({ isManaged: true });

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(managedItem);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isReadonly: true,
        })
      );
    });

    it('should use config.isReadonly function when provided', () => {
      const customIsReadonly = jest.fn().mockReturnValue(true);
      mockFeatures.contentEditor = {
        onSave: mockOnSave,
        isReadonly: customIsReadonly,
      };

      const item = createMockItem({ isManaged: false });

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(customIsReadonly).toHaveBeenCalledWith(item);
      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isReadonly: true,
        })
      );
    });

    it('should pass readonlyReason from config function', () => {
      const customReadonlyReason = jest.fn().mockReturnValue('This is a managed item');
      mockFeatures.contentEditor = {
        onSave: mockOnSave,
        isReadonly: () => true,
        readonlyReason: customReadonlyReason,
      };

      const item = createMockItem();

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(customReadonlyReason).toHaveBeenCalledWith(item);
      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          readonlyReason: 'This is a managed item',
        })
      );
    });

    it('should pass customValidators from config', () => {
      const customValidators = { title: [{ type: 'error' as const, fn: jest.fn() }] };
      mockFeatures.contentEditor = {
        onSave: mockOnSave,
        customValidators,
      };

      const item = createMockItem();

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          customValidators,
        })
      );
    });

    it('should call appendRows with item and pass result', () => {
      const appendRowsResult = <div>Custom rows</div>;
      const mockAppendRows = jest.fn().mockReturnValue(appendRowsResult);
      mockFeatures.contentEditor = {
        onSave: mockOnSave,
        appendRows: mockAppendRows,
      };

      const item = createMockItem();

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockAppendRows).toHaveBeenCalledWith(item);
      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          appendRows: appendRowsResult,
        })
      );
    });

    it('should call onSave, refetch, and close when saving', async () => {
      mockOnSave.mockResolvedValue(undefined);
      mockRefetch.mockResolvedValue(undefined);

      const item = createMockItem();

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      // Get the onSave handler that was passed to openContentEditor.
      const passedOnSave = mockOpenContentEditor.mock.calls[0][0].onSave;

      await act(async () => {
        await passedOnSave({ id: 'item-1', title: 'Updated', description: '', tags: [] });
      });

      expect(mockOnSave).toHaveBeenCalledWith({
        id: 'item-1',
        title: 'Updated',
        description: '',
        tags: [],
      });
      expect(mockRefetch).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle items without tags', () => {
      const item = createMockItem({ tags: undefined });

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({
            tags: [],
          }),
        })
      );
    });

    it('should handle items without dates', () => {
      const item = createMockItem({
        createdAt: undefined,
        updatedAt: undefined,
      });

      const { result } = renderHook(() => useOpenContentEditor());

      act(() => {
        result.current!(item);
      });

      expect(mockOpenContentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({
            createdAt: undefined,
            updatedAt: undefined,
          }),
        })
      );
    });
  });
});
