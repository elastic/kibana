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
import type { WorkflowPreview } from '../../../common/lib/export/workflow_preview';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
import { parseImportFile } from '../lib/parse_import_file';
import type { ClientPreflightResult } from '../lib/parse_import_file';

jest.mock('../lib/parse_import_file');
jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_telemetry');
jest.mock('../../../widgets/worflows_triggers_list/worflows_triggers_list', () => ({
  WorkflowsTriggersList: ({ triggers }: { triggers: Array<{ type: string }> }) => (
    <span data-test-subj="mock-triggers-list">
      {triggers.map((t) => t.type).join(', ') || 'No triggers'}
    </span>
  ),
}));

const mockParseImportFile = parseImportFile as jest.MockedFunction<typeof parseImportFile>;

// var avoids TDZ when the hoisted jest.mock factory assigns these before `let` would init
const mockMgetWorkflows = jest.fn();
const mockBulkCreateWorkflows = jest.fn();
jest.mock('@kbn/workflows-ui', () => {
  return {
    useRunWorkflow: () => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      data: undefined,
      error: null,
      reset: jest.fn(),
    }),
    useWorkflowsApi: () => ({
      mgetWorkflows: mockMgetWorkflows,
      bulkCreateWorkflows: mockBulkCreateWorkflows,
    }),
  };
});

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTelemetry = useTelemetry as jest.MockedFunction<typeof useTelemetry>;

const createWorkflowPreview = (props: Partial<WorkflowPreview>): WorkflowPreview => ({
  id: 'test',
  name: 'Test',
  description: 'Test description',
  triggers: [{ type: 'manual' }],
  inputCount: 0,
  stepCount: 0,
  valid: true,
  ...props,
});

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

const createPreflightResult = (
  overrides: Partial<ClientPreflightResult> & {
    workflows?: Array<
      Partial<ClientPreflightResult['workflows'][number]> & { id: string; yaml?: string }
    >;
  } = {}
): ClientPreflightResult => {
  const defaults: ClientPreflightResult = {
    format: 'yaml',
    totalWorkflows: 0,
    parseErrors: [],
    workflows: [],
    workflowIds: [],
    rawWorkflows: [],
  };

  const merged = { ...defaults, ...overrides };

  const workflows: ClientPreflightResult['workflows'] = (overrides.workflows ?? []).map((w) => ({
    id: w.id,
    name: w.name ?? w.id,
    description: w.description ?? null,
    triggers: w.triggers ?? [],
    inputCount: w.inputCount ?? 0,
    stepCount: w.stepCount ?? 0,
    valid: w.valid ?? true,
  }));

  const rawWorkflows = (overrides.workflows ?? []).map((w) => ({
    id: w.id,
    yaml: 'yaml' in w && w.yaml && typeof w.yaml === 'string' ? w.yaml : `name: ${w.name ?? w.id}`,
  }));

  return {
    ...merged,
    workflows,
    rawWorkflows: overrides.rawWorkflows ?? rawWorkflows,
    workflowIds: overrides.workflowIds ?? workflows.map((w) => w.id),
    totalWorkflows: overrides.totalWorkflows ?? workflows.length,
  };
};

describe('ImportWorkflowsFlyout', () => {
  let mockToasts: {
    addSuccess: jest.Mock;
    addWarning: jest.Mock;
    addDanger: jest.Mock;
    addError: jest.Mock;
  };
  let mockTelemetry: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToasts = {
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addDanger: jest.fn(),
      addError: jest.fn(),
    };
    mockTelemetry = {
      reportWorkflowImported: jest.fn(),
      reportWorkflowExported: jest.fn(),
    };
    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: mockToasts },
      },
    } as any);
    mockUseTelemetry.mockReturnValue(mockTelemetry as any);
  });

  afterEach(async () => {
    await act(async () => {});
    cleanup();
  });

  describe('rendering', () => {
    it('should render flyout title, file picker, conflict resolution, and buttons', () => {
      renderFlyout();

      expect(screen.getByText('Import workflows')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-file-picker')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-cancel')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-confirm')).toBeInTheDocument();
      expect(screen.getByTestId('import-workflows-conflict-resolution')).toBeInTheDocument();
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
      expect(mockMgetWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('preflight', () => {
    it('should parse file client-side and check conflicts on file selection', async () => {
      const clientResult = createPreflightResult({
        workflows: [createWorkflowPreview({ id: 'test', name: 'Test' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(mockParseImportFile).toHaveBeenCalled();
        expect(mockMgetWorkflows).toHaveBeenCalledWith({ ids: ['test'], source: ['name'] });
      });
    });

    it('should show conflict callout when conflicts are detected', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [
          createWorkflowPreview({
            id: 'w-1',
            name: 'Existing Workflow',
            triggers: [{ type: 'manual' }],
            stepCount: 1,
          }),
          createWorkflowPreview({
            id: 'w-2',
            name: 'New Workflow',
            triggers: [{ type: 'alert' }],
            stepCount: 1,
          }),
        ],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([{ id: 'w-1', name: 'Existing Workflow' }]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-conflicts')).toBeInTheDocument();
      });
      const conflictCallout = screen.getByTestId('import-workflows-conflicts');
      expect(conflictCallout).toHaveTextContent(/1 workflow has an ID conflict/);
      expect(screen.getByTestId('import-preview-conflict-w-1')).toBeInTheDocument();
      expect(screen.queryByTestId('import-preview-conflict-w-2')).not.toBeInTheDocument();
    });

    it('should enable import button with no conflicts', async () => {
      const clientResult = createPreflightResult({
        workflows: [createWorkflowPreview({ id: 'test', name: 'Test' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

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
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [
          createWorkflowPreview({
            id: 'w-1',
            name: 'My Workflow',
            description: 'Does things',
            triggers: [{ type: 'manual' }],
            inputCount: 2,
            stepCount: 3,
          }),
          createWorkflowPreview({
            id: 'w-2',
            name: 'Alert Handler',
            triggers: [{ type: 'alert' }, { type: 'scheduled' }],
            stepCount: 1,
          }),
        ],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

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
      expect(screen.getByText('Does things')).toBeInTheDocument();
      expect(screen.getByText('Alert Handler')).toBeInTheDocument();
      expect(screen.getByText('manual')).toBeInTheDocument();
      expect(screen.getByText('alert, scheduled')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should fall back to ID when name is null', async () => {
      const clientResult = createPreflightResult({
        workflows: [
          createWorkflowPreview({
            id: 'fallback-id',
            name: undefined as unknown as string,
            valid: false,
          }),
        ],
        rawWorkflows: [{ id: 'fallback-id', yaml: 'bad yaml' }],
      });
      clientResult.workflows[0].name = null;
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'bad yaml')] } });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-preview')).toBeInTheDocument();
      });
      expect(screen.getByText('fallback-id')).toBeInTheDocument();
    });

    it('should not render preview when workflows array is empty', async () => {
      const clientResult = createPreflightResult();
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

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
    it('should show Close button and success icons after successful import', async () => {
      const clientResult = createPreflightResult({
        workflows: [createWorkflowPreview({ id: 'test', name: 'Test' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockResolvedValueOnce({
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
        expect(screen.getByTestId('import-workflows-close')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('import-workflows-confirm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('import-workflows-cancel')).not.toBeInTheDocument();
      expect(screen.getByTestId('import-preview-success-test')).toBeInTheDocument();
    });

    it('should show success and failure icons on partial success', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [
          createWorkflowPreview({ id: 'w-1', name: 'Workflow 1' }),
          createWorkflowPreview({ id: 'w-2', name: 'Workflow 2' }),
        ],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockResolvedValueOnce({
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
        expect(screen.getByTestId('import-workflows-close')).toBeInTheDocument();
      });
      expect(screen.getByTestId('import-preview-success-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('import-preview-failed-w-2')).toBeInTheDocument();
    });

    it('should show failure icon on full failure', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Workflow 1' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockResolvedValueOnce({
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
        expect(screen.getByTestId('import-workflows-close')).toBeInTheDocument();
      });
      expect(screen.getByTestId('import-preview-failed-w-1')).toBeInTheDocument();
    });

    it('should show Close button after import with parse errors', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Workflow 1' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockResolvedValueOnce({
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
        expect(screen.getByTestId('import-workflows-close')).toBeInTheDocument();
      });
      expect(screen.getByTestId('import-preview-success-w-1')).toBeInTheDocument();
    });

    it('should send overwrite=true when conflict resolution is overwrite', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Existing' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([{ id: 'w-1', name: 'Existing' }]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      const select = screen.getByTestId('import-workflows-conflict-resolution');
      fireEvent.change(select, { target: { value: 'overwrite' } });

      mockBulkCreateWorkflows.mockResolvedValueOnce({
        created: [{ id: 'w-1' }],
        failed: [],
        parseErrors: [],
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockBulkCreateWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({ overwrite: true })
        );
      });
    });

    it('should call bulkCreateWorkflows with new IDs when conflict resolution is generateNewIds', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Existing' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([{ id: 'w-1', name: 'Existing' }]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      mockBulkCreateWorkflows.mockResolvedValueOnce({
        created: [{ id: 'w-new' }],
        failed: [],
        parseErrors: [],
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        const [{ workflows }] = mockBulkCreateWorkflows.mock.calls[0];
        expect(workflows).toHaveLength(1);
        expect(workflows[0].id).not.toBe('w-1');
        expect(workflows[0].id).toMatch(/^workflow-/);
      });
    });
  });

  describe('telemetry', () => {
    it('should report successful import telemetry with workflow metadata', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [
          createWorkflowPreview({
            id: 'w-1',
            name: 'Workflow 1',
            stepCount: 3,
            triggers: [{ type: 'manual' }],
          }),
          createWorkflowPreview({
            id: 'w-2',
            name: 'Workflow 2',
            stepCount: 7,
            triggers: [{ type: 'alert' }, { type: 'scheduled' }],
          }),
        ],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockResolvedValueOnce({
        created: [{ id: 'w-1' }, { id: 'w-2' }],
        failed: [],
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
        expect(mockTelemetry.reportWorkflowImported).toHaveBeenCalledTimes(1);
      });

      expect(mockTelemetry.reportWorkflowImported).toHaveBeenCalledWith({
        workflowCount: 2,
        format: 'zip',
        conflictResolution: 'generateNewIds',
        hasConflicts: false,
        successCount: 2,
        failedCount: 0,
        minStepCount: 3,
        maxStepCount: 7,
        minTriggerCount: 1,
        maxTriggerCount: 2,
      });
    });

    it('should report failed import telemetry with error', async () => {
      const clientResult = createPreflightResult({
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Test', stepCount: 2, triggers: [] })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockRejectedValueOnce(new Error('Server error'));

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.yml', 'name: Test')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockTelemetry.reportWorkflowImported).toHaveBeenCalledTimes(1);
      });

      expect(mockTelemetry.reportWorkflowImported).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCount: 1,
          format: 'yaml',
          successCount: 0,
          failedCount: 1,
          error: expect.any(Error),
        })
      );
    });

    it('should report import telemetry with overwrite conflict resolution', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [
          createWorkflowPreview({
            id: 'w-1',
            name: 'Existing',
            stepCount: 4,
            triggers: [{ type: 'manual' }],
          }),
        ],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([{ id: 'w-1', name: 'Existing' }]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      const select = screen.getByTestId('import-workflows-conflict-resolution');
      fireEvent.change(select, { target: { value: 'overwrite' } });

      mockBulkCreateWorkflows.mockResolvedValueOnce({
        created: [{ id: 'w-1' }],
        failed: [],
        parseErrors: [],
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockTelemetry.reportWorkflowImported).toHaveBeenCalledTimes(1);
      });

      expect(mockTelemetry.reportWorkflowImported).toHaveBeenCalledWith(
        expect.objectContaining({
          conflictResolution: 'overwrite',
          hasConflicts: true,
        })
      );
    });

    it('should not report telemetry when import is not triggered', async () => {
      const clientResult = createPreflightResult({
        workflows: [createWorkflowPreview({ id: 'test', name: 'Test' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.yml', 'name: Test')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      // Do not click import — telemetry should not be called
      expect(mockTelemetry.reportWorkflowImported).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should call onClose when cancel button is clicked', () => {
      const { onClose } = renderFlyout();

      fireEvent.click(screen.getByTestId('import-workflows-cancel'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('parse errors', () => {
    it('should show parse errors callout when preflight returns parseErrors', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Valid' })],
        parseErrors: [
          'Entry readme.txt is not a .yml file',
          'Unexpected nested entry subdir/w.yml',
        ],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByText(/2 lines were skipped due to parse errors/)).toBeInTheDocument();
      });
    });

    it('should display both conflict and parse error callouts simultaneously', async () => {
      const clientResult = createPreflightResult({
        format: 'zip',
        workflows: [createWorkflowPreview({ id: 'w-1', name: 'Existing' })],
        parseErrors: ['Entry readme.txt is not a .yml file'],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValue([{ id: 'w-1', name: 'Existing' }]);

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, {
        target: { files: [createSmallFile('test.zip', 'zip-content')] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-conflicts')).toBeInTheDocument();
        expect(screen.getByText(/1 line was skipped due to parse errors/)).toBeInTheDocument();
      });
    });
  });

  describe('import error handling', () => {
    it('should show error toast when import API call fails', async () => {
      const clientResult = createPreflightResult({
        workflows: [createWorkflowPreview({ id: 'test', name: 'Test' })],
      });
      mockParseImportFile.mockResolvedValue(clientResult);
      mockMgetWorkflows.mockResolvedValueOnce([]);
      mockBulkCreateWorkflows.mockRejectedValueOnce(new Error('Server error'));

      renderFlyout();

      const input = getFileInput();
      fireEvent.change(input, { target: { files: [createSmallFile('test.yml', 'name: Test')] } });

      await waitFor(() => {
        expect(screen.getByTestId('import-workflows-confirm')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('import-workflows-confirm'));

      await waitFor(() => {
        expect(mockToasts.addError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ title: 'Failed to import workflows' })
        );
      });
    });
  });
});
