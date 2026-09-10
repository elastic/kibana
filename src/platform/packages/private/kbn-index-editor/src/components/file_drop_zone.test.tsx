/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License"
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side"
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public"
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FileDropzone } from './file_drop_zone';
import { useFileUploadContext, STATUS } from '@kbn/file-upload';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getOverrideConfirmation } from './modals/override_warning_modal';
import { IndexEditorErrors } from '../types';

// Mock child components
jest.mock('./empty_prompt', () => ({
  EmptyPrompt: () => <div>EmptyPrompt</div>,
}));

// Mock hooks and modules
jest.mock('@kbn/file-upload');
jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('./modals/override_warning_modal');

const mockUseFileUploadContext = useFileUploadContext as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockGetOverrideConfirmation = getOverrideConfirmation as jest.Mock;

const mockIndexUpdateService = {
  setError: jest.fn(),
  discardUnsavedChanges: jest.fn(),
  canEditIndex: true,
  setIsSaving: jest.fn(),
  isSaving$: {
    subscribe: (cb: (isSaving: boolean) => void) => {
      cb(false);
      return { unsubscribe: () => {} };
    },
  },
};

const mockFileUploadManager = {
  addFiles: jest.fn(),
  removeFile: jest.fn(),
  getFiles: jest.fn().mockReturnValue([]),
};

describe('FileDropzone', () => {
  let fileUploadContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    fileUploadContext = {
      fileUploadManager: mockFileUploadManager,
      filesStatus: [],
      uploadStatus: {
        analysisStatus: STATUS.NOT_STARTED,
        overallImportStatus: STATUS.NOT_STARTED,
        errors: [],
      },
      indexName: 'my-index',
    };
    mockUseFileUploadContext.mockReturnValue(fileUploadContext);
    mockUseKibana.mockReturnValue({
      services: { indexUpdateService: mockIndexUpdateService },
    });
    mockGetOverrideConfirmation.mockResolvedValue(true);
  });

  const TestComponent: React.FC<{ noResults?: boolean }> = ({ noResults = false }) => (
    <FileDropzone noResults={noResults}>
      <div>Child Content</div>
    </FileDropzone>
  );

  it('renders null if indexName is not provided', () => {
    fileUploadContext.indexName = null;
    const { container } = renderWithI18n(<TestComponent />);
    expect(container.firstChild).toBeNull();
  });

  it('renders children by default', () => {
    const { getByText } = renderWithI18n(<TestComponent />);
    expect(getByText('Child Content')).toBeInTheDocument();
  });

  it('does not render dropzone if canEditIndex is false', () => {
    mockIndexUpdateService.canEditIndex = false;
    const { getByText, queryByTestId } = renderWithI18n(<TestComponent />);
    expect(getByText('Child Content')).toBeInTheDocument();
    expect(queryByTestId('indexEditorFileInput')).not.toBeInTheDocument();
    mockIndexUpdateService.canEditIndex = true;
  });

  it('renders EmptyPrompt when noResults is true and no files are being shown', () => {
    const { getByText } = renderWithI18n(<TestComponent noResults={true} />);
    expect(getByText('EmptyPrompt')).toBeInTheDocument();
  });

  it('calls setError when a file is too large', () => {
    fileUploadContext.filesStatus = [
      {
        fileTooLarge: true,
        fileName: 'large-file.csv',
        fileSizeInfo: { maxFileSizeFormatted: '100MB', fileSizeFormatted: '120MB' },
      },
    ];
    renderWithI18n(<TestComponent />);
    expect(mockIndexUpdateService.setError).toHaveBeenCalledWith(
      IndexEditorErrors.FILE_TOO_BIG_ERROR,
      expect.any(String)
    );
  });

  it('calls setError on file analysis error', () => {
    fileUploadContext.filesStatus = [
      {
        analysisStatus: STATUS.FAILED,
        fileName: 'bad-file.csv',
        analysisError: { body: { message: 'Invalid format' } },
      },
    ];
    renderWithI18n(<TestComponent />);
    expect(mockIndexUpdateService.setError).toHaveBeenCalledWith(
      IndexEditorErrors.FILE_ANALYSIS_ERROR,
      expect.stringContaining('bad-file.csv: Invalid format')
    );
  });

  it('calls setError on generic upload error', () => {
    fileUploadContext.uploadStatus.errors = [
      { title: 'Upload failed', error: { error: { reason: 'Server is down' } } },
    ];
    renderWithI18n(<TestComponent />);
    expect(mockIndexUpdateService.setError).toHaveBeenCalledWith(
      IndexEditorErrors.FILE_UPLOAD_ERROR,
      expect.stringContaining('Upload failed: \n Server is down')
    );
  });

  describe('Drag and Drop', () => {
    const file = new File(['a,b,c\n1,2,3'], 'test.csv', { type: 'text/csv' });

    it('handles file drop, gets confirmation, and adds file', async () => {
      const { container } = renderWithI18n(<TestComponent />);
      const dropzone = container.firstChild as HTMLElement;

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(mockGetOverrideConfirmation).toHaveBeenCalled();
      });
      expect(mockIndexUpdateService.discardUnsavedChanges).toHaveBeenCalled();
      expect(mockFileUploadManager.addFiles).toHaveBeenCalledWith([file]);
    });

    it('does not add file if override confirmation is denied', async () => {
      mockGetOverrideConfirmation.mockResolvedValue(false);
      const { container } = renderWithI18n(<TestComponent />);
      const dropzone = container.firstChild as HTMLElement;

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(mockGetOverrideConfirmation).toHaveBeenCalled();
      });
      expect(mockIndexUpdateService.discardUnsavedChanges).not.toHaveBeenCalled();
      expect(mockFileUploadManager.addFiles).not.toHaveBeenCalled();
    });
  });
});
