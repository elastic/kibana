/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ImportWorkflowsFlyout } from './import_workflows_flyout';
import { parseImportFile } from '../lib/parse_import_file';
import type { ClientPreflightResult } from '../lib/parse_import_file';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../lib/parse_import_file');
jest.mock('../../../hooks/use_kibana');

const mockParseImportFile = parseImportFile as jest.MockedFunction<typeof parseImportFile>;
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    data: undefined,
    error: null,
    reset: jest.fn(),
  }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createSmallFile = (name: string, content: string): File =>
  new File([content], name, { type: 'text/plain' });

const createOversizedFile = (): File => {
  const content = 'x'.repeat(11 * 1024 * 1024);
  return new File([content], 'huge.zip', { type: 'application/zip' });
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

const renderFlyout = (props: Partial<{ onClose: jest.Mock }> = {}) => {
  const onClose = props.onClose ?? jest.fn();
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ImportWorkflowsFlyout onClose={onClose} />
      </I18nProvider>
    </QueryClientProvider>
  );
  return { onClose, ...result };
};

const getFileInput = (): HTMLInputElement => {
  const el = screen.getByTestId('import-workflows-file-picker');
  if (el.tagName === 'INPUT') {
    return el as HTMLInputElement;
  }
  const input = el.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error('Could not find file input inside import-workflows-file-picker');
  }
  return input;
};

describe('ImportWorkflowsFlyout', () => {
  let mockHttpPost: jest.Mock;
  let mockToasts: {
    addSuccess: jest.Mock;
    addWarning: jest.Mock;
    addDanger: jest.Mock;
    addError: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpPost = jest.fn();
    mockToasts = {
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addDanger: jest.fn(),
      addError: jest.fn(),
    };
    mockUseKibana.mockReturnValue({
      services: {
        http: { post: mockHttpPost },
        notifications: { toasts: mockToasts },
      },
    } as any);
  });

  afterEach(async () => {
    await act(async () => {});
    cleanup();
  });

  describe('rendering', () => {
    it('should render flyout title, file picker, and buttons', () => {
      renderFlyout();

      expect(screen.getByText('Import workflows')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-file-picker')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-cancel')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-confirm')).toBeInTheDocument();
    });

    it('should disable import button when no file is selected', () => {
      renderFlyout();

      expect(screen.getByTestId('import-workflows-confirm')).toBeDisabled();
    });
  });

  describe('file size validation', () => {
    it('should show error for files exceeding 10 MB', async () => {
      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createOversizedFile()] } });

      await waitFor(() => {
        expect(screen.getByText(/exceeds the 10 MB limit/)).toBeInTheDocument();
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });

  describe('preflight', () => {
    it('should parse file client-side and check conflicts on file selection', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'test',
            name: 'Test',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: true,
          },
        ],
        workflowIds: ['test'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValue({ conflicts: [] });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(mockParseImportFile).toHaveBeenCalled();
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/api/workflows/_check-conflicts',
          expect.objectContaining({
            body: JSON.stringify({ ids: ['test'] }),
          })
        );
      });
    });

    it('should show conflict callout when conflicts are detected', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 2,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'Existing Workflow',
            description: null,
            triggers: [{ type: 'manual' }],
            inputCount: 0,
            stepCount: 1,
            valid: true,
          },
          {
            id: 'w-2',
            name: 'New Workflow',
            description: null,
            triggers: [{ type: 'alert' }],
            inputCount: 0,
            stepCount: 1,
            valid: true,
          },
        ],
        workflowIds: ['w-1', 'w-2'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValue({
        conflicts: [{ id: 'w-1', existingName: 'Existing Workflow' }],
      });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-conflicts')).toBeInTheDocument();
      });
      const conflictCallout = screen.getByTestId('import-workflows-conflicts');
      expect(conflictCallout).toHaveTextContent('Existing Workflow');
    });

    it('should enable import button with no conflicts', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'test',
            name: 'Test',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: true,
          },
        ],
        workflowIds: ['test'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValue({ conflicts: [] });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });
    });

    it('should show error toast and clear file when preflight fails', async () => {
      mockParseImportFile.mockRejectedValue(new Error('Parse error'));

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(mockToasts.addError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ title: 'Failed to analyze file' })
        );
      });
    });
  });

  describe('preview', () => {
    it('should render the preview table when workflows are returned', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 2,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'My Workflow',
            description: 'Does things',
            triggers: [{ type: 'manual' }],
            inputCount: 2,
            stepCount: 3,
            valid: true,
          },
          {
            id: 'w-2',
            name: 'Alert Handler',
            description: null,
            triggers: [{ type: 'alert' }, { type: 'scheduled' }],
            inputCount: 0,
            stepCount: 1,
            valid: true,
          },
        ],
        workflowIds: ['w-1', 'w-2'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValue({ conflicts: [] });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-preview')).toBeInTheDocument();
      });
      expect(screen.getByText('Workflows to import (2)')).toBeInTheDocument();
      expect(screen.getByText('My Workflow')).toBeInTheDocument();
      expect(screen.getByText('Alert Handler')).toBeInTheDocument();
      expect(screen.getByText('manual')).toBeInTheDocument();
      expect(screen.getByText('alert')).toBeInTheDocument();
      expect(screen.getByText('scheduled')).toBeInTheDocument();
    });

    it('should fall back to ID when name is null', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'fallback-id',
            name: null,
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: false,
          },
        ],
        workflowIds: ['fallback-id'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValue({ conflicts: [] });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'bad yaml')] } });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-preview')).toBeInTheDocument();
      });
      expect(screen.getByText('fallback-id')).toBeInTheDocument();
    });

    it('should not render preview when workflows array is empty', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 0,
        parseErrors: [],
        workflows: [],
        workflowIds: [],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValue({ conflicts: [] });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(mockParseImportFile).toHaveBeenCalled();
      });
      expect(screen.queryByTestId('import-workflows-preview')).not.toBeInTheDocument();
    });
  });

  describe('import', () => {
    it('should show success toast on successful import', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'test',
            name: 'Test',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: true,
          },
        ],
        workflowIds: ['test'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost
        .mockResolvedValueOnce({ conflicts: [] })
        .mockResolvedValueOnce({
          created: [{ id: 'w-1', name: 'Test' }],
          failed: [],
          parseErrors: [],
        });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockToasts.addSuccess).toHaveBeenCalled();
      });
    });

    it('should show warning toast on partial success', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 2,
        parseErrors: [],
        workflows: [],
        workflowIds: ['w-1', 'w-2'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost
        .mockResolvedValueOnce({ conflicts: [] })
        .mockResolvedValueOnce({
          created: [{ id: 'w-1' }],
          failed: [{ index: 1, error: 'invalid yaml' }],
          parseErrors: [],
        });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockToasts.addWarning).toHaveBeenCalled();
      });
    });

    it('should show danger toast on full failure', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [],
        workflowIds: ['w-1'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost
        .mockResolvedValueOnce({ conflicts: [] })
        .mockResolvedValueOnce({
          created: [],
          failed: [{ index: 0, error: 'bad yaml' }],
          parseErrors: [],
        });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockToasts.addDanger).toHaveBeenCalled();
      });
    });

    it('should show warning toast when parse errors are returned', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [],
        workflowIds: ['w-1'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost
        .mockResolvedValueOnce({ conflicts: [] })
        .mockResolvedValueOnce({
          created: [{ id: 'w-1' }],
          failed: [],
          parseErrors: ['Entry readme.txt is not a .yml file'],
        });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockToasts.addWarning).toHaveBeenCalledTimes(1);
        expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should send overwrite=true when conflict resolution is overwrite', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'Existing',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: true,
          },
        ],
        workflowIds: ['w-1'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValueOnce({
        conflicts: [{ id: 'w-1', existingName: 'Existing' }],
      });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-conflicts')).toBeInTheDocument();
      });

      const overwriteRadio = screen.getByLabelText(/Overwrite existing workflows/);
      fireEvent.click(overwriteRadio);

      mockHttpPost.mockResolvedValueOnce({
        created: [{ id: 'w-1' }],
        failed: [],
        parseErrors: [],
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        const importCall = mockHttpPost.mock.calls.find(
          (call: unknown[]) => call[0] === '/api/workflows/_import'
        );
        expect(importCall).toBeDefined();
        expect(importCall![1]).toEqual(expect.objectContaining({ query: { overwrite: true } }));
      });
    });

    it('should send generateNewIds=true when conflict resolution is generateNewIds', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'Existing',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: true,
          },
        ],
        workflowIds: ['w-1'],
      };
      mockParseImportFile.mockResolvedValue(clientResult);
      mockHttpPost.mockResolvedValueOnce({
        conflicts: [{ id: 'w-1', existingName: 'Existing' }],
      });

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-conflicts')).toBeInTheDocument();
      });

      mockHttpPost.mockResolvedValueOnce({
        created: [{ id: 'w-new' }],
        failed: [],
        parseErrors: [],
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        const importCall = mockHttpPost.mock.calls.find(
          (call: unknown[]) => call[0] === '/api/workflows/_import'
        );
        expect(importCall).toBeDefined();
        expect(importCall![1]).toEqual(
          expect.objectContaining({ query: { generateNewIds: true } })
        );
      });
    });
  });

  describe('cancel', () => {
    it('should call onClose when cancel button is clicked', () => {
      const { onClose } = renderFlyout();

      fireEvent.click(screen.getByTestId('import-workflows-cancel'));

      expect(onClose).toHaveBeenCalled();
    });
  });
});
