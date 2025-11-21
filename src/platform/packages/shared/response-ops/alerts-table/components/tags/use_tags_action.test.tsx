/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useTagsAction } from './use_tags_action';
import type { Alert } from '@kbn/alerting-types';

describe('useTagsAction', () => {
  const mockAlert = {
    id: 'alert-1',
    version: 'v1',
    _index: 'test-index',
    'kibana.alert.workflow_tags': ['coke', 'pepsi'],
  } as unknown as Alert;

  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an action', async () => {
    const { result } = renderHook(() =>
      useTagsAction({
        onAction,
        onActionSuccess,
        isDisabled: false,
      })
    );

    expect(result.current.getAction([mockAlert])).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "cases-bulk-action-tags",
        "disabled": false,
        "icon": <EuiIcon
          size="m"
          type="tag"
        />,
        "key": "cases-bulk-action-tags",
        "name": "Edit tags",
        "onClick": [Function],
      }
    `);
  });

  it('processes the tags correctly', async () => {
    const { result } = renderHook(() =>
      useTagsAction({ onAction, onActionSuccess, isDisabled: false })
    );

    const action = result.current.getAction([mockAlert]);

    act(() => {
      action.onClick();
    });

    expect(onAction).toHaveBeenCalled();
    expect(result.current.isFlyoutOpen).toBe(true);

    act(() => {
      result.current.onSaveTags({ selectedItems: ['one'], unSelectedItems: ['pepsi'] });
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
    });
  });

  it('opens and closes the flyout correctly', async () => {
    const { result } = renderHook(() =>
      useTagsAction({ onAction, onActionSuccess, isDisabled: false })
    );

    const action = result.current.getAction([mockAlert]);

    // Initially closed
    expect(result.current.isFlyoutOpen).toBe(false);

    // Open the flyout
    act(() => {
      action.onClick();
    });

    expect(result.current.isFlyoutOpen).toBe(true);

    // Close the flyout
    act(() => {
      result.current.onFlyoutClosed();
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
    });
  });

  it('handles multiple alerts', async () => {
    const { result } = renderHook(() =>
      useTagsAction({ onAction, onActionSuccess, isDisabled: false })
    );

    const mockAlert2 = {
      ...mockAlert,
      id: 'alert-2',
      _id: 'alert-2',
      'kibana.alert.workflow_tags': ['one', 'three'],
    } as unknown as Alert;

    const action = result.current.getAction([mockAlert, mockAlert2]);

    act(() => {
      action.onClick();
    });

    expect(result.current.isFlyoutOpen).toBe(true);

    act(() => {
      result.current.onSaveTags({ selectedItems: ['one', 'two'], unSelectedItems: ['pepsi'] });
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
    });
  });
});
