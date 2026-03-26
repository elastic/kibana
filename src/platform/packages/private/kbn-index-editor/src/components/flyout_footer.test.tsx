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
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { FlyoutFooter } from './flyout_footer';
import { renderWithI18n } from '@kbn/test-jest-helpers';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@kbn/file-upload', () => ({
  ...jest.requireActual('@kbn/file-upload'),
  useFileUploadContext: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseFileUploadContext = useFileUploadContext as jest.Mock;

describe('FlyoutFooter', () => {
  let isSaving$: BehaviorSubject<boolean>;
  let indexCreated$: BehaviorSubject<boolean>;
  let hasUnsavedChanges$: BehaviorSubject<boolean>;
  let indexName$: BehaviorSubject<string | null>;
  let mockIndexUpdateService: any;
  let mockFileUploadContext: any;
  let onClose: jest.Mock;

  beforeEach(() => {
    isSaving$ = new BehaviorSubject<boolean>(false);
    indexCreated$ = new BehaviorSubject<boolean>(false);
    hasUnsavedChanges$ = new BehaviorSubject<boolean>(false);
    indexName$ = new BehaviorSubject<string | null>('my-index');

    mockIndexUpdateService = {
      isSaving$,
      setIsSaving: (isSaving: boolean) => isSaving$.next(isSaving),
      indexCreated$,
      isIndexCreated: () => indexCreated$.getValue(),
      hasUnsavedChanges$,
      indexName$,
      getIndexName: () => indexName$.getValue(),
      createIndex: jest.fn().mockResolvedValue({}),
      flush: jest.fn(),
    };

    mockFileUploadContext = {
      uploadStatus: { overallImportStatus: STATUS.NOT_STARTED },
      onImportClick: jest.fn(),
      canImport: false,
      setExistingIndexName: jest.fn(),
    };

    mockUseKibana.mockReturnValue({
      services: {
        indexUpdateService: mockIndexUpdateService,
        notifications: { toasts: { addError: jest.fn() } },
      },
    });

    mockUseFileUploadContext.mockReturnValue(mockFileUploadContext);
    onClose = jest.fn();
  });

  it('calls onClose when the close button is clicked', async () => {
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    fireEvent.click(screen.getByTestId('indexEditorCloseButton'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows save buttons when there are unsaved changes', async () => {
    hasUnsavedChanges$.next(true);
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByTestId('indexEditorSaveChangesButton')).toBeInTheDocument();
      expect(screen.getByTestId('indexEditorSaveAndCloseButton')).toBeInTheDocument();
    });
  });

  it('does not show save buttons when there are no unsaved changes', async () => {
    hasUnsavedChanges$.next(false);
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    await waitFor(() => {
      expect(screen.queryByTestId('indexEditorSaveChangesButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('indexEditorSaveAndCloseButton')).not.toBeInTheDocument();
    });
  });

  it('calls createIndex when save is clicked and index is not created', async () => {
    hasUnsavedChanges$.next(true);
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    fireEvent.click(screen.getByTestId('indexEditorSaveChangesButton'));
    await waitFor(() => {
      expect(mockIndexUpdateService.createIndex).toHaveBeenCalledWith({ exitAfterFlush: false });
    });
  });

  it('calls createIndex with exitAfterFlush when save and close is clicked', async () => {
    hasUnsavedChanges$.next(true);
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    fireEvent.click(screen.getByTestId('indexEditorSaveAndCloseButton'));
    await waitFor(() => {
      expect(mockIndexUpdateService.createIndex).toHaveBeenCalledWith({ exitAfterFlush: true });
    });
  });

  it('calls flush when save is clicked and index is created', async () => {
    hasUnsavedChanges$.next(true);
    indexCreated$.next(true);
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    fireEvent.click(screen.getByTestId('indexEditorSaveChangesButton'));
    await waitFor(() => {
      expect(mockIndexUpdateService.flush).toHaveBeenCalledWith({ exitAfterFlush: false });
    });
  });

  it('shows saving spinner when isSaving is true', async () => {
    isSaving$.next(true);
    renderWithI18n(<FlyoutFooter onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/Saving.../)).toBeInTheDocument();
    });
  });
});
