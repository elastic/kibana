/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CancelSyncJobModal } from './sync_job_cancel_modal';
import '@testing-library/jest-dom/extend-expect';
import { I18nProvider } from '@kbn/i18n-react';

describe('CancelSyncJobModal', () => {
  const mockSyncJobId = '123';
  const mockOnConfirmCb = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    render(
      <I18nProvider>
        <CancelSyncJobModal
          syncJobId={mockSyncJobId}
          onConfirmCb={mockOnConfirmCb}
          onCancel={mockOnCancel}
          isLoading={false}
          errorMessages={[]}
        />
      </I18nProvider>
    );
  });

  test('renders the sync job ID', () => {
    const syncJobIdElement = screen.getByTestId('confirmModalBodyText');
    expect(syncJobIdElement).toHaveTextContent(`Sync job ID: ${mockSyncJobId}`);
  });

  test('calls onConfirmCb when confirm button is clicked', () => {
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    expect(mockOnConfirmCb).toHaveBeenCalledWith(mockSyncJobId);
  });

  test('calls onCancel when cancel button is clicked', () => {
    const cancelButton = screen.getByTestId('confirmModalCancelButton');
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
