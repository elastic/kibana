/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';
import { useExceptionListHeader } from './use_list_header';

describe('useExceptionListHeader', () => {
  const onEditListDetails = jest.fn();
  it('should return the default values', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionListHeader({ name: 'list name', description: '', onEditListDetails })
    );
    const { isModalVisible, listDetails } = current;
    expect(isModalVisible).toBeFalsy();
    expect(listDetails).toStrictEqual({ name: 'list name', description: '' });
  });
  it('should change the isModalVisible to be true when onEdit is called', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionListHeader({ name: 'list name', description: '', onEditListDetails })
    );
    const { isModalVisible, onEdit } = current;
    act(() => {
      onEdit();
    });

    waitFor(() => {
      expect(isModalVisible).toBeTruthy();
    });
  });

  it('should call onEditListDetails with the new details after editing', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionListHeader({ name: 'list name', description: '', onEditListDetails })
    );
    const { isModalVisible, onEdit } = current;
    act(() => {
      onEdit();
    });

    waitFor(() => {
      expect(isModalVisible).toBeTruthy();
    });

    const { onSave } = current;
    act(() => {
      onSave({ name: 'New name', description: 'New Description' });
    });

    waitFor(() => {
      expect(isModalVisible).toBeFalsy();
      expect(onEditListDetails).toBeCalledWith({
        name: 'New name',
        description: 'New Description',
      });
    });
  });
  it('should close the Modal when the cancel is called', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionListHeader({ name: 'list name', description: '', onEditListDetails })
    );
    const { isModalVisible, onEdit } = current;
    act(() => {
      onEdit();
    });

    waitFor(() => {
      expect(isModalVisible).toBeTruthy();
    });

    const { onCancel } = current;
    act(() => {
      onCancel();
    });

    waitFor(() => {
      expect(isModalVisible).toBeFalsy();
    });
  });
});
