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
import { render, screen } from '@testing-library/react';
import React from 'react';
import { monaco } from '@kbn/code-editor';
import { I18nProvider } from '@kbn/i18n-react';

import { renderWorkflowChangeHistoryPreview } from './workflow_change_history_preview';

vi.mock('@kbn/workflows-ui', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/workflows-ui')),
    useDefineWorkflowsMonacoTheme: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_workflow_change_history_preview_validation', () => {
  const mocked = {
    useWorkflowChangeHistoryPreviewValidation: vi.fn(() => ({
      validationResults: [],
      isValidationLoading: false,
      validationError: null,
      handleValidationErrorClick: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion', () => {
  const mocked = {
    WorkflowYamlValidationAccordion: () => (
      <div data-test-subj="workflowYamlEditorValidationErrorsList" />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/code-editor', () => {
  const mocked = {
    monaco: {
      MarkerSeverity: { Error: 8 },
      editor: {
        createModel: vi.fn((value: string) => ({ value, dispose: vi.fn() })),
        create: vi.fn(() => ({
          dispose: vi.fn(),
          layout: vi.fn(),
          getModel: vi.fn(() => ({ dispose: vi.fn() })),
          updateOptions: vi.fn(),
          createDecorationsCollection: vi.fn(() => ({ clear: vi.fn() })),
        })),
        createDiffEditor: vi.fn(() => ({
          setModel: vi.fn(),
          dispose: vi.fn(),
          layout: vi.fn(),
          updateOptions: vi.fn(),
          getLineChanges: vi.fn(() => []),
          onDidUpdateDiff: vi.fn(() => ({ dispose: vi.fn() })),
          getOriginalEditor: vi.fn(() => ({ updateOptions: vi.fn() })),
          getModifiedEditor: vi.fn(() => ({
            updateOptions: vi.fn(),
            getModel: vi.fn(() => ({ dispose: vi.fn() })),
            createDecorationsCollection: vi.fn(() => ({ clear: vi.fn() })),
          })),
        })),
        setModelMarkers: vi.fn(),
        onDidChangeMarkers: vi.fn(() => ({ dispose: vi.fn() })),
      },
    },
  };
  return { ...mocked, default: mocked };
});

const mockCreateEditor = monaco.editor.create as Mock;
const mockCreateDiffEditor = monaco.editor.createDiffEditor as Mock;

const makeDetail = (yaml: string) => ({
  id: 'evt-3',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  snapshot: { workflow: { yaml } },
});

const renderPreview = (props: Parameters<typeof renderWorkflowChangeHistoryPreview>[0]) =>
  render(
    <I18nProvider>
      <div data-test-subj="previewHost">{renderWorkflowChangeHistoryPreview(props)}</div>
    </I18nProvider>
  );

describe('workflow change history preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the selected version yaml in the monaco preview', () => {
    renderPreview({
      objectId: 'workflow-1',
      change: makeDetail('name: historical\n'),
    });

    expect(screen.getByTestId('workflowChangeHistoryMonacoPreview')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryMonacoEditor')).toBeInTheDocument();
    expect(monaco.editor.create).toHaveBeenCalled();
    expect(monaco.editor.createModel).toHaveBeenCalledWith('name: historical\n', 'yaml');
    expect(screen.queryByTestId('workflowChangeHistoryCompareSettings')).not.toBeInTheDocument();
  });

  it('renders the monaco preview when the snapshot has no yaml', () => {
    renderPreview({
      objectId: 'workflow-1',
      change: {
        ...makeDetail(''),
        snapshot: {},
      },
    });

    expect(screen.getByTestId('workflowChangeHistoryMonacoPreview')).toBeInTheDocument();
    expect(monaco.editor.createModel).toHaveBeenCalledWith('', 'yaml');
  });

  it('renders compare diff with baseline as original and target as modified', () => {
    renderPreview({
      objectId: 'workflow-1',
      change: makeDetail('name: historical\n'),
      compareSpec: {
        comparisonType: 'vs_previous',
        baseline: { ...makeDetail('name: historical\n'), metadata: { version: 1 } },
        target: { ...makeDetail('name: current\n'), metadata: { version: 6 }, isCurrent: true },
      },
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(monaco.editor.createModel).toHaveBeenNthCalledWith(1, 'name: historical\n', 'yaml');
    expect(monaco.editor.createModel).toHaveBeenNthCalledWith(2, 'name: current\n', 'yaml');
    expect(screen.getByTestId('workflowChangeHistoryCompareIndicator')).toBeInTheDocument();
    expect(screen.getByText('Comparing with:')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryCompareIndicatorBadge')).toHaveTextContent(
      'v1'
    );
  });

  it('shows target yaml while compare context is loading', () => {
    renderPreview({
      objectId: 'workflow-1',
      change: makeDetail('name: historical\n'),
      compareSpec: {
        comparisonType: 'vs_previous',
        baseline: makeDetail('name: historical\n'),
        target: makeDetail('name: current\n'),
      },
      isLoadingCompareContext: true,
    });

    expect(mockCreateEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).not.toHaveBeenCalled();
    expect(monaco.editor.createModel).toHaveBeenCalledWith('name: current\n', 'yaml');
  });
});
