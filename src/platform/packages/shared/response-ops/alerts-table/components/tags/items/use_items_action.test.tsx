/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useItemsAction } from './use_items_action';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';

describe('useItemsAction', () => {
  const mockAlert = {
    _id: 'alert-1',
    _index: 'test-index',
    ALERT_WORKFLOW_TAGS: ['coke', 'pepsi'],
  } as unknown as Alert;

  const onAction = jest.fn();
  const onActionSuccess = jest.fn();
  const successToasterTitle = jest.fn().mockReturnValue('My toaster title');
  const fieldSelector = jest.fn().mockImplementation((item) => item[ALERT_WORKFLOW_TAGS]);
  const itemsTransformer = jest.fn().mockImplementation((items) => items);

  const props = {
    isDisabled: false,
    fieldKey: 'tags' as const,
    onAction,
    onActionSuccess,
    successToasterTitle,
    fieldSelector,
    itemsTransformer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('flyout', () => {
    it('opens the flyout', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      expect(result.current.isFlyoutOpen).toBe(false);

      act(() => {
        result.current.openFlyout([mockAlert]);
      });

      expect(result.current.isFlyoutOpen).toBe(true);
    });

    it('closes the flyout', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      expect(result.current.isFlyoutOpen).toBe(false);

      act(() => {
        result.current.openFlyout([mockAlert]);
      });

      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onFlyoutClosed();
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(onAction).toHaveBeenCalled();
    });
  });

  describe('items', () => {
    it('update the items correctly', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      act(() => {
        result.current.openFlyout([mockAlert]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(onActionSuccess).toHaveBeenCalled();
      expect(fieldSelector).toHaveBeenCalled();
      expect(itemsTransformer).toHaveBeenCalled();
    });

    it('calls fieldSelector correctly', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      act(() => {
        result.current.openFlyout([mockAlert]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(fieldSelector).toHaveBeenCalledWith(mockAlert);
    });

    it('calls itemsTransformer correctly', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      const alertWithExtraTags = {
        ...mockAlert,
        ALERT_WORKFLOW_TAGS: ['coke', 'pepsi', 'one'],
      } as Alert;

      act(() => {
        result.current.openFlyout([alertWithExtraTags]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(itemsTransformer).toHaveBeenCalledWith(['coke', 'one']);
    });

    it('removes duplicates', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      act(() => {
        result.current.openFlyout([mockAlert]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one', 'one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      // Verify that itemsTransformer is called with deduplicated items
      expect(itemsTransformer).toHaveBeenCalledWith(['coke', 'one']);
    });

    it('do not process alerts with no changes', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      const emptyAlert = {
        ...mockAlert,
        ALERT_WORKFLOW_TAGS: [],
      } as Alert;

      act(() => {
        result.current.openFlyout([emptyAlert]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: [], unSelectedItems: ['pepsi'] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(fieldSelector).toHaveBeenCalled();
    });

    it('do not process if the selected items are the same but with different order', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      const alertWithTags = {
        ...mockAlert,
        ALERT_WORKFLOW_TAGS: ['1', '2'],
      } as Alert;

      act(() => {
        result.current.openFlyout([alertWithTags]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: ['2', '1'], unSelectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(fieldSelector).toHaveBeenCalled();
    });

    it('do not process if the selected items are the same', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      const alertWithTag = {
        ...mockAlert,
        ALERT_WORKFLOW_TAGS: ['1'],
      } as Alert;

      act(() => {
        result.current.openFlyout([alertWithTag]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: ['1'], unSelectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(fieldSelector).toHaveBeenCalled();
    });

    it('do not process if selecting and unselecting the same item', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      const alertWithTag = {
        ...mockAlert,
        ALERT_WORKFLOW_TAGS: ['1'],
      } as Alert;

      act(() => {
        result.current.openFlyout([alertWithTag]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: ['1'], unSelectedItems: ['1'] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(fieldSelector).toHaveBeenCalled();
    });

    it('do not process with empty items and no selection', async () => {
      const { result } = renderHook(() => useItemsAction(props));

      const emptyAlert = {
        ...mockAlert,
        ALERT_WORKFLOW_TAGS: [],
      } as Alert;

      act(() => {
        result.current.openFlyout([emptyAlert]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: [], unSelectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
      });

      expect(fieldSelector).toHaveBeenCalled();
    });
  });
});
