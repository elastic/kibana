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
import { applyWorkflowYamlValidationToEditor } from './apply_workflow_yaml_validation_to_editor';
import { WorkflowChangeHistoryMonacoPreview } from './workflow_change_history_monaco_preview';
import { navigateToErrorPosition } from '../../widgets/workflow_yaml_editor/lib/utils';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'workflows-theme',
}));

jest.mock('../../widgets/workflow_yaml_editor/lib/utils', () => ({
  navigateToErrorPosition: jest.fn(),
}));

jest.mock('./apply_workflow_yaml_validation_to_editor', () => ({
  applyWorkflowYamlValidationToEditor: jest.fn(() => Promise.resolve({ validationResults: [] })),
}));

jest.mock('../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion', () => ({
  WorkflowYamlValidationAccordion: ({
    extraAction,
    validationErrors,
    onErrorClick,
  }: {
    extraAction?: React.ReactNode;
    validationErrors?: YamlValidationResult[] | null;
    onErrorClick?: (error: YamlValidationResult) => void;
  }) => (
    <div data-test-subj="workflowYamlEditorValidationErrorsList">
      {(validationErrors ?? []).length === 0
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
};

const mockRevealLineInCenter = jest.fn();
const mockRevealLinesInCenter = jest.fn();
const mockSetPosition = jest.fn();
const mockDiffUpdateOptions = jest.fn();
const mockOriginalUpdateOptions = jest.fn();
const mockModifiedUpdateOptions = jest.fn();
const onDidUpdateDiffCallbacks: Array<() => void> = [];

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    MarkerSeverity: { Error: 8 },
    editor: {
      createModel: jest.fn((value: string) => ({ value, dispose: jest.fn() })),
      create: jest.fn(() => ({
        dispose: jest.fn(),
        getModel: jest.fn(() => mockYamlModel),
      })),
      createDiffEditor: jest.fn(() => ({
        setModel: jest.fn(),
        dispose: jest.fn(),
        updateOptions: mockDiffUpdateOptions,
        getLineChanges: jest.fn(() => [
          {
            originalStartLineNumber: 10,
            originalEndLineNumber: 10,
            modifiedStartLineNumber: 12,
            modifiedEndLineNumber: 12,
          },
        ]),
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
        })),
      })),
      setModelMarkers: jest.fn(),
    },
  },
}));

const mockCreateEditor = monaco.editor.create as jest.Mock;
const mockCreateDiffEditor = monaco.editor.createDiffEditor as jest.Mock;
const mockApplyValidation = applyWorkflowYamlValidationToEditor as jest.Mock;
const mockNavigateToErrorPosition = navigateToErrorPosition as jest.Mock;

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
    onDidUpdateDiffCallbacks.length = 0;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders a read-only editor when no compare yaml is provided', () => {
    jest.useFakeTimers();
    renderPreview({ yaml: 'name: current\n' });

    expect(screen.getByTestId('workflowChangeHistoryMonacoPreview')).toBeInTheDocument();
    expect(mockCreateEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).not.toHaveBeenCalled();
    expect(screen.getByText('No validation errors')).toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton')).toBeInTheDocument();
  });

  it('renders a read-only editor when compare yaml is identical', () => {
    jest.useFakeTimers();
    renderPreview({
      yaml: 'name: same\n',
      compareYaml: 'name: same\n',
    });

    expect(mockCreateEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).not.toHaveBeenCalled();
    expect(screen.queryByTestId('workflowChangeHistoryDiffNavigator')).not.toBeInTheDocument();
  });

  it('renders a diff editor when compare yaml differs', () => {
    jest.useFakeTimers();
    renderPreview({
      yaml: 'name: current\n',
      compareYaml: 'name: original\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflowChangeHistoryDiffNavigator')).toHaveTextContent(
      '1 of 1 changes'
    );
    expect(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton')).toBeInTheDocument();
  });

  it('scrolls to the first diff when diff computation completes', () => {
    jest.useFakeTimers();
    renderPreview({
      yaml: 'name: current\nsteps:\n  - name: updated\n',
      compareYaml: 'name: original\nsteps:\n  - name: old\n',
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
      yaml: 'name: current\n',
      compareYaml: 'name: original\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();

    const createCallsBeforeToggle = mockCreateDiffEditor.mock.calls.length;

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryCompareSplit'));

    expect(mockDiffUpdateOptions).toHaveBeenCalledWith({ renderSideBySide: true });
    expect(mockCreateDiffEditor.mock.calls.length).toBe(createCallsBeforeToggle);
  });

  it('re-validates with highlight enabled when the setting is toggled on', async () => {
    jest.useFakeTimers();
    renderPreview({ yaml: 'name: current\n' });

    await act(async () => {
      jest.advanceTimersByTime(150);
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledWith(
        expect.anything(),
        'name: current\n',
        false,
        expect.anything(),
        expect.anything()
      );
    });

    mockApplyValidation.mockClear();

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('workflowChangeHistoryHighlightValidationErrors'));

    await act(async () => {
      jest.advanceTimersByTime(150);
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledWith(
        expect.anything(),
        'name: current\n',
        true,
        expect.anything(),
        expect.anything()
      );
    });
  });

  it('does not show compare mode settings when yaml has no diff baseline', () => {
    jest.useFakeTimers();
    renderPreview({ yaml: 'name: current\n' });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));

    expect(screen.queryByTestId('workflowChangeHistoryCompareUnified')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowChangeHistoryCompareSplit')).not.toBeInTheDocument();
  });

  it('navigates to a validation error when an error row is clicked', async () => {
    jest.useFakeTimers();
    mockApplyValidation.mockResolvedValue({
      validationResults: [sampleValidationError],
    });

    renderPreview({ yaml: 'name: current\nsteps:\n  - bad\n' });

    await act(async () => {
      jest.advanceTimersByTime(150);
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(`workflowYamlValidationError-${sampleValidationError.id}`)
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(`workflowYamlValidationError-${sampleValidationError.id}`));

    expect(mockNavigateToErrorPosition).toHaveBeenCalledWith(
      expect.anything(),
      sampleValidationError.startLineNumber,
      sampleValidationError.startColumn
    );
  });

  it('moves compare mode selection and focus with arrow keys', () => {
    jest.useFakeTimers();
    renderPreview({
      yaml: 'name: current\n',
      compareYaml: 'name: original\n',
    });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryPreviewSettingsButton'));

    const unifiedTile = screen.getByTestId('workflowChangeHistoryCompareUnified');
    const splitTile = screen.getByTestId('workflowChangeHistoryCompareSplit');

    unifiedTile.focus();
    expect(unifiedTile).toHaveFocus();

    fireEvent.keyDown(unifiedTile, { key: 'ArrowRight' });

    expect(splitTile).toHaveFocus();
    expect(mockDiffUpdateOptions).toHaveBeenCalledWith({ renderSideBySide: true });
  });
});
