/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { getOverrideConfirmation, OverrideWarningModal } from './override_warning_modal';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { KibanaContextExtra } from '../../types';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (component: unknown) => component,
}));

const mockStorage: jest.Mocked<Storage> = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
} as unknown as jest.Mocked<Storage>;

describe('OverrideWarningModal', () => {
  let onCancel: jest.Mock;
  let onContinue: jest.Mock;

  beforeEach(() => {
    onCancel = jest.fn();
    onContinue = jest.fn();
  });

  it('renders the modal with title and body', () => {
    renderWithI18n(
      <OverrideWarningModal onCancel={onCancel} onContinue={onContinue} storage={mockStorage} />
    );

    expect(screen.getByText('This action will override your data')).toBeInTheDocument();
    expect(
      screen.getByText(`By continuing, you'll lose unsaved changes in your table.`)
    ).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    renderWithI18n(
      <OverrideWarningModal onCancel={onCancel} onContinue={onContinue} storage={mockStorage} />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onContinue when the continue button is clicked', () => {
    renderWithI18n(
      <OverrideWarningModal onCancel={onCancel} onContinue={onContinue} storage={mockStorage} />
    );

    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('does not call storage.set when continue is clicked and checkbox is not checked', () => {
    renderWithI18n(
      <OverrideWarningModal onCancel={onCancel} onContinue={onContinue} storage={mockStorage} />
    );

    fireEvent.click(screen.getByText('Continue'));
    expect(mockStorage.set).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalled();
  });

  it('calls storage.set when continue is clicked and checkbox is checked', async () => {
    renderWithI18n(
      <OverrideWarningModal onCancel={onCancel} onContinue={onContinue} storage={mockStorage} />
    );

    const checkbox = screen.getByLabelText("Don't ask me again");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(mockStorage.set).toHaveBeenCalledWith('indexEditor.OverrideWarningDismissed', true);
    });
    expect(onContinue).toHaveBeenCalled();
  });
});

describe('getOverrideConfirmation', () => {
  let mockKibanaContext: KibanaContextExtra;
  let hasUnsavedChanges$: BehaviorSubject<boolean>;

  beforeEach(() => {
    hasUnsavedChanges$ = new BehaviorSubject<boolean>(true);

    mockKibanaContext = {
      indexUpdateService: {
        hasUnsavedChanges$,
      } as any,
      storage: mockStorage,
      overlays: {
        openModal: jest.fn(() => ({ close: jest.fn() })),
      } as any,
      rendering: {} as any,
    } as unknown as KibanaContextExtra;
  });

  it('resolves true if there are no unsaved changes', async () => {
    hasUnsavedChanges$.next(false);
    const result = await getOverrideConfirmation(mockKibanaContext);
    expect(result).toBe(true);
    expect(mockKibanaContext.overlays.openModal).not.toHaveBeenCalled();
  });

  it('resolves true if the warning has been dismissed', async () => {
    mockStorage.get.mockReturnValue(true);
    const result = await getOverrideConfirmation(mockKibanaContext);
    expect(result).toBe(true);
    expect(mockKibanaContext.overlays.openModal).not.toHaveBeenCalled();
  });

  it('opens a modal if there are unsaved changes and the warning is not dismissed', async () => {
    mockStorage.get.mockReturnValue(false);
    getOverrideConfirmation(mockKibanaContext);
    await waitFor(() => {
      expect(mockKibanaContext.overlays.openModal).toHaveBeenCalled();
    });
  });

  it('resolves false when the modal is cancelled', async () => {
    mockStorage.get.mockReturnValue(false);
    const promise = getOverrideConfirmation(mockKibanaContext);

    await waitFor(() => {
      expect(mockKibanaContext.overlays.openModal).toHaveBeenCalled();
    });

    const openModalMock = mockKibanaContext.overlays.openModal as jest.Mock;
    const modalComponent = openModalMock.mock.calls[0][0];
    modalComponent.props.onCancel();

    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves true when the modal is continued', async () => {
    mockStorage.get.mockReturnValue(false);
    const promise = getOverrideConfirmation(mockKibanaContext);

    await waitFor(() => {
      expect(mockKibanaContext.overlays.openModal).toHaveBeenCalled();
    });

    const openModalMock = mockKibanaContext.overlays.openModal as jest.Mock;
    const modalComponent = openModalMock.mock.calls[0][0];
    modalComponent.props.onContinue();

    const result = await promise;
    expect(result).toBe(true);
  });
});
