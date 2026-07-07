/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { monaco } from '@kbn/code-editor';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowChangeHistoryMonacoPreview } from './workflow_change_history_monaco_preview';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

jest.mock('@kbn/workflows-ui', () => ({
  useDefineWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'workflows-theme',
}));

let mockValidationResults: YamlValidationResult[] = [];
let mockIsValidationLoading = false;
const mockHandleValidationErrorClick = jest.fn();

jest.mock('./use_workflow_change_history_preview_validation', () => ({
  useWorkflowChangeHistoryPreviewValidation: jest.fn(() => ({
    validationResults: mockValidationResults,
    isValidationLoading: mockIsValidationLoading,
    handleValidationErrorClick: mockHandleValidationErrorClick,
  })),
}));

jest.mock('../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion', () => ({
  WorkflowYamlValidationAccordion: ({
    extraAction,
    validationErrors,
    isLoading,
    onErrorClick,
  }: {
    extraAction?: React.ReactNode;
    validationErrors?: YamlValidationResult[] | null;
    isLoading?: boolean;
    onErrorClick?: (error: YamlValidationResult) => void;
  }) => (
    <div data-test-subj="workflowYamlEditorValidationErrorsList">
      {isLoading
        ? 'Initializing validation...'
        : (validationErrors ?? []).length === 0
        ? 'No validation errors'
        : (validationErrors ?? []).map((error) => (
            <button
              key={error.id}
              type="button"
              data-test-subj={`workflowYamlValidationError-${error.id}`}
              onClick={() => onErrorClick?.(error)}
            >
              {error.message}
            </button>
          ))}
      {extraAction}
    </div>
  ),
}));

const mockYamlModel = {
  getLineLength: jest.fn(() => 10),
  getLineCount: jest.fn(() => 1),
  getValue: jest.fn(() => 'name: current\n'),
  uri: { toString: () => 'inmemory://model/current.yaml' },
};

const mockRevealLineInCenter = jest.fn();
const mockRevealLinesInCenter = jest.fn();
const mockSetPosition = jest.fn();
const mockDiffUpdateOptions = jest.fn();
const mockOriginalUpdateOptions = jest.fn();
const mockModifiedUpdateOptions = jest.fn();
const onDidUpdateDiffCallbacks: Array<() => void> = [];
let mockLineChanges: Array<{
  originalStartLineNumber: number;
  originalEndLineNumber: number;
  modifiedStartLineNumber: number;
  modifiedEndLineNumber: number;
}> = [
  {
    originalStartLineNumber: 10,
    originalEndLineNumber: 10,
    modifiedStartLineNumber: 12,
    modifiedEndLineNumber: 12,
  },
];

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    MarkerSeverity: { Error: 8 },
    editor: {
      createModel: jest.fn((value: string) => ({ value, dispose: jest.fn() })),
      create: jest.fn(() => ({
        dispose: jest.fn(),
        layout: jest.fn(),
        getModel: jest.fn(() => mockYamlModel),
        updateOptions: jest.fn(),
        createDecorationsCollection: jest.fn(() => ({ clear: jest.fn() })),
      })),
      createDiffEditor: jest.fn(() => ({
        setModel: jest.fn(),
        dispose: jest.fn(),
        layout: jest.fn(),
        updateOptions: mockDiffUpdateOptions,
        getLineChanges: jest.fn(() => mockLineChanges),
        onDidUpdateDiff: jest.fn((listener: () => void) => {
          onDidUpdateDiffCallbacks.push(listener);
          return { dispose: jest.fn() };
        }),
        setPosition: mockSetPosition,
        revealLineInCenter: mockRevealLineInCenter,
        revealLinesInCenter: mockRevealLinesInCenter,
        getOriginalEditor: jest.fn(() => ({ updateOptions: mockOriginalUpdateOptions })),
        getModifiedEditor: jest.fn(() => ({
          updateOptions: mockModifiedUpdateOptions,
          revealLineInCenter: jest.fn(),
          getModel: jest.fn(() => mockYamlModel),
          createDecorationsCollection: jest.fn(() => ({ clear: jest.fn() })),
        })),
      })),
      setModelMarkers: jest.fn(),
      onDidChangeMarkers: jest.fn(() => ({ dispose: jest.fn() })),
    },
  },
}));

const mockCreateEditor = monaco.editor.create as jest.Mock;
const mockCreateDiffEditor = monaco.editor.createDiffEditor as jest.Mock;

const sampleValidationError: YamlValidationResult = {
  id: 'preview-validation-error',
  severity: 'error',
  message: 'Invalid workflow step',
  owner: 'step-name-validation',
  startLineNumber: 3,
  startColumn: 5,
  endLineNumber: 3,
  endColumn: 10,
  hoverMessage: null,
};

const renderPreview = (props: React.ComponentProps<typeof WorkflowChangeHistoryMonacoPreview>) =>
  render(
    <I18nProvider>
      <WorkflowChangeHistoryMonacoPreview {...props} />
    </I18nProvider>
  );

describe('WorkflowChangeHistoryMonacoPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationResults = [];
    mockIsValidationLoading = false;
    onDidUpdateDiffCallbacks.length = 0;
    mockLineChanges = [
      {
        originalStartLineNumber: 10,
        originalEndLineNumber: 10,
        modifiedStartLineNumber: 12,
        modifiedEndLineNumber: 12,
      },
    ];
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders a read-only editor when no compare yaml is provided', () => {
    jest.useFakeTimers();
    renderPreview({ targetYaml: 'name: current\n' });

    expect(screen.getByTestId('workflowChangeHistoryMonacoPreview')).toBeInTheDocument();
    expect(mockCreateEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).not.toHaveBeenCalled();
    expect(screen.queryByText('No validation errors')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton')).toBeInTheDocument();
  });

  it('renders a diff editor when compare yaml is identical', () => {
    jest.useFakeTimers();
    mockLineChanges = [];
    renderPreview({
      targetYaml: 'name: same\n',
      baselineYaml: 'name: same\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflowChangeHistoryDiffNavigator')).toHaveTextContent(
      'No changes'
    );
  });

  it('shows the comparing-with indicator when identical versions are compared', () => {
    jest.useFakeTimers();
    mockLineChanges = [];
    renderPreview({
      targetYaml: 'name: same\n',
      baselineYaml: 'name: same\n',
      compareIndicator: {
        baselineVersion: 69,
        currentVersion: 71,
      },
    });

    expect(screen.getByTestId('workflowChangeHistoryCompareIndicator')).toBeInTheDocument();
    expect(screen.getByText('Comparing with:')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryCompareIndicatorBadge')).toHaveTextContent(
      'v69'
    );
    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(screen.getByTestId('workflowChangeHistoryDiffNavigator')).toHaveTextContent(
      'No changes'
    );

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    expect(screen.getByTestId('workflowChangeHistoryCompareUnified')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryCompareSplit')).toBeInTheDocument();
  });

  it('renders a diff editor when compare yaml is empty and current yaml is not', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: v2\n',
      baselineYaml: '',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(monaco.editor.createModel).toHaveBeenCalledWith('', 'yaml');

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));

    expect(screen.getByTestId('workflowChangeHistoryCompareUnified')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryCompareSplit')).toBeInTheDocument();
  });

  it('calls reportDiffViewed when compare yaml differs', () => {
    jest.useFakeTimers();
    const reportDiffViewed = jest.fn();

    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
      diffTelemetry: {
        compareMode: 'unified',
        setCompareMode: jest.fn(),
        reportDiffViewed,
        reportDiffChangeNavigated: jest.fn(),
      },
    });

    expect(reportDiffViewed).toHaveBeenCalledTimes(1);
  });

  it('does not call reportDiffViewed when compare yaml is identical', () => {
    jest.useFakeTimers();
    const reportDiffViewed = jest.fn();
    mockLineChanges = [];

    renderPreview({
      targetYaml: 'name: same\n',
      baselineYaml: 'name: same\n',
      diffTelemetry: {
        compareMode: 'unified',
        setCompareMode: jest.fn(),
        reportDiffViewed,
        reportDiffChangeNavigated: jest.fn(),
      },
    });

    expect(reportDiffViewed).not.toHaveBeenCalled();
  });

  it('renders a diff editor when compare yaml differs', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lineNumbers: 'on', renderSideBySide: false })
    );
    expect(mockOriginalUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ lineNumbers: 'off' })
    );
    expect(mockModifiedUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ lineNumbers: 'on' })
    );
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflowChangeHistoryDiffNavigator')).toHaveTextContent(
      '1 of 1 changes'
    );
    expect(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton')).toBeInTheDocument();
  });

  it('shows the comparing-with indicator when compare labels are provided', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
      compareIndicator: {
        baselineVersion: 5,
        currentVersion: 8,
      },
    });

    expect(screen.getByTestId('workflowChangeHistoryCompareIndicator')).toBeInTheDocument();
    expect(screen.getByText('Comparing with:')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryCompareIndicatorBadge')).toHaveTextContent(
      'v5'
    );
  });

  it('shows split pane labels when compare mode is split', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
      compareIndicator: {
        baselineVersion: 5,
        currentVersion: 8,
      },
    });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryCompareSplit'));

    expect(screen.getByTestId('workflowChangeHistoryCompareSplitPaneLabels')).toBeInTheDocument();
    expect(screen.getByText('Previous version:')).toBeInTheDocument();
    expect(screen.getByText('Current version:')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryCompareSplitBaselineBadge')).toHaveTextContent(
      'v5'
    );
    expect(screen.getByTestId('workflowChangeHistoryCompareSplitCurrentBadge')).toHaveTextContent(
      'v8'
    );
    expect(screen.queryByTestId('workflowChangeHistoryCompareIndicator')).not.toBeInTheDocument();
  });

  it('scrolls to the first diff when diff computation completes', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: current\nsteps:\n  - name: updated\n',
      baselineYaml: 'name: original\nsteps:\n  - name: old\n',
    });

    expect(onDidUpdateDiffCallbacks).toHaveLength(1);
    act(() => {
      onDidUpdateDiffCallbacks[0]();
    });

    expect(mockSetPosition).toHaveBeenCalledWith({ lineNumber: 12, column: 1 });
    expect(mockRevealLineInCenter).toHaveBeenCalledWith(12);
  });

  it('updates diff layout via updateOptions when compare mode changes', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();

    const createCallsBeforeToggle = mockCreateDiffEditor.mock.calls.length;

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryCompareSplit'));

    expect(mockDiffUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ renderSideBySide: true, renderIndicators: true })
    );
    expect(mockCreateDiffEditor.mock.calls.length).toBe(createCallsBeforeToggle);
  });

  it('keeps settings popover open when toggling highlight validation', () => {
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
    });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    expect(screen.getByTestId('workflowChangeHistoryCompareUnified')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowChangeHistoryHighlightValidationErrors'));

    expect(screen.getByTestId('workflowChangeHistoryCompareUnified')).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowChangeHistoryHighlightValidationErrors')
    ).toBeInTheDocument();
  });

  it('keeps settings popover open when switching compare mode', () => {
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
    });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryCompareSplit'));

    expect(screen.getByTestId('workflowChangeHistoryCompareUnified')).toBeInTheDocument();
    expect(
      screen.getByTestId('workflowChangeHistoryHighlightValidationErrors')
    ).toBeInTheDocument();
  });

  it('shows validation settings when highlight validation is enabled', () => {
    renderPreview({ targetYaml: 'name: current\n' });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryHighlightValidationErrors'));

    expect(screen.getByTestId('workflowYamlEditorValidationErrorsList')).toBeInTheDocument();
    expect(screen.getByText('No validation errors')).toBeInTheDocument();
  });

  it('does not show compare mode settings when yaml has no diff baseline', () => {
    jest.useFakeTimers();
    renderPreview({ targetYaml: 'name: current\n' });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));

    expect(screen.queryByTestId('workflowChangeHistoryCompareUnified')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowChangeHistoryCompareSplit')).not.toBeInTheDocument();
  });

  it('shows the validation accordion when highlight validation is enabled', async () => {
    jest.useFakeTimers();
    renderPreview({ targetYaml: 'name: current\n' });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryHighlightValidationErrors'));

    await act(async () => {
      jest.advanceTimersByTime(150);
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('No validation errors')).toBeInTheDocument();
    });
  });

  it('delegates validation error clicks to the preview validation hook', async () => {
    mockValidationResults = [sampleValidationError];

    renderPreview({ targetYaml: 'name: current\nsteps:\n  - bad\n' });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryHighlightValidationErrors'));

    await waitFor(() => {
      expect(
        screen.getByTestId(`workflowYamlValidationError-${sampleValidationError.id}`)
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(`workflowYamlValidationError-${sampleValidationError.id}`));

    expect(mockHandleValidationErrorClick).toHaveBeenCalledWith(sampleValidationError);
  });

  it('moves compare mode selection and focus with arrow keys', () => {
    jest.useFakeTimers();
    renderPreview({
      targetYaml: 'name: current\n',
      baselineYaml: 'name: original\n',
    });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));

    const unifiedTile = screen.getByTestId('workflowChangeHistoryCompareUnified');
    const splitTile = screen.getByTestId('workflowChangeHistoryCompareSplit');

    unifiedTile.focus();
    expect(unifiedTile).toHaveFocus();

    fireEvent.keyDown(unifiedTile, { key: 'ArrowRight' });

    expect(splitTile).toHaveFocus();
    expect(mockDiffUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ renderSideBySide: true, renderIndicators: true })
    );
  });
});
