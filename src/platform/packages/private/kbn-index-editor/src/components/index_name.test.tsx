/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { IndexName } from './index_name';

vi.mock('@kbn/kibana-react-plugin/public');
vi.mock('@kbn/file-upload', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/file-upload')),
      useFileUploadContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseKibana = useKibana as Mock;
const mockUseFileUploadContext = useFileUploadContext as Mock;

describe('IndexName', () => {
  let indexName$: BehaviorSubject<string | null>;
  let indexCreated$: BehaviorSubject<boolean>;
  let mockIndexUpdateService: any;
  let mockFileUpload: any;
  let mockFileUploadContext: any;

  beforeEach(() => {
    indexName$ = new BehaviorSubject<string | null>(null);
    indexCreated$ = new BehaviorSubject<boolean>(false);

    mockIndexUpdateService = {
      indexName$,
      getIndexName: () => indexName$.getValue(),
      setIndexName: (name: string) => indexName$.next(name),
      indexCreated$,
      isIndexCreated: () => indexCreated$.getValue(),
    };

    mockFileUpload = {
      checkIndexExists: vi.fn().mockResolvedValue(false),
    };

    mockFileUploadContext = {
      indexName: '',
      setIndexName: vi.fn(),
      setIndexValidationStatus: vi.fn(),
    };

    mockUseKibana.mockReturnValue({
      services: {
        fileUpload: mockFileUpload,
        indexUpdateService: mockIndexUpdateService,
      },
    });

    mockUseFileUploadContext.mockReturnValue(mockFileUploadContext);
  });

  it('renders with input open when no index name is set', async () => {
    render(<IndexName />);
    await waitFor(() => {
      expect(screen.getByTestId('indexNameInput')).toBeInTheDocument();
    });
  });

  it('renders in read mode when an index name is set', async () => {
    indexName$.next('my-index');
    render(<IndexName />);
    await waitFor(() => {
      expect(screen.getByTestId('indexNameReadMode')).toHaveTextContent('my-index');
    });
  });

  it('validates and saves a new index name', async () => {
    render(<IndexName />);
    const input = await screen.findByTestId('indexNameInput');
    fireEvent.change(input, { target: { value: 'new-index' } });
    fireEvent.click(screen.getByTestId('indexNameSaveButton'));

    await waitFor(() => {
      expect(mockFileUpload.checkIndexExists).toHaveBeenCalledWith('new-index');
      expect(mockIndexUpdateService.getIndexName()).toBe('new-index');
      expect(mockFileUploadContext.setIndexName).toHaveBeenCalledWith('new-index');
      expect(mockFileUploadContext.setIndexValidationStatus).toHaveBeenCalledWith(STATUS.COMPLETED);
      expect(screen.getByTestId('indexNameReadMode')).toHaveTextContent('new-index');
    });
  });

  it('shows an error for invalid start characters', async () => {
    render(<IndexName />);
    const input = await screen.findByTestId('indexNameInput');
    fireEvent.change(input, { target: { value: '-invalid-name' } });
    fireEvent.click(screen.getByTestId('indexNameSaveButton'));

    await waitFor(() => {
      expect(screen.getByText(/The index name must not start with/)).toBeInTheDocument();
    });
  });

  it('shows an error for invalid characters', async () => {
    render(<IndexName />);
    const input = await screen.findByTestId('indexNameInput');
    fireEvent.change(input, { target: { value: 'invalid#name' } });
    fireEvent.click(screen.getByTestId('indexNameSaveButton'));

    await waitFor(() => {
      expect(screen.getByText(/The index name must not contain spaces or/)).toBeInTheDocument();
    });
  });

  it('shows an error if index name already exists', async () => {
    mockFileUpload.checkIndexExists.mockResolvedValue(true);
    render(<IndexName />);
    const input = await screen.findByTestId('indexNameInput');
    fireEvent.change(input, { target: { value: 'existing-index' } });
    fireEvent.click(screen.getByTestId('indexNameSaveButton'));

    await waitFor(() => {
      expect(screen.getByText(/Index name already exists/)).toBeInTheDocument();
      expect(mockFileUploadContext.setIndexValidationStatus).toHaveBeenCalledWith(STATUS.FAILED);
    });
  });
});
