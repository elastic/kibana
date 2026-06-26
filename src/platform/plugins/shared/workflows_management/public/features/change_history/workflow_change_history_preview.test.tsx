/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryProvider } from '@kbn/change-history-ui';
import { I18nProvider } from '@kbn/i18n-react';

import { renderWorkflowChangeHistoryPreview } from './workflow_change_history_preview';

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      createModel: jest.fn(() => ({ dispose: jest.fn() })),
      createDiffEditor: jest.fn(() => ({
        setModel: jest.fn(),
        dispose: jest.fn(),
      })),
    },
  },
}));

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'workflows-theme',
}));

const makeDetail = (id: string, yaml: string, { isCurrent }: { isCurrent?: boolean } = {}) => ({
  id,
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  ...(isCurrent ? { isCurrent: true } : {}),
  snapshot: { workflow: { yaml } },
});

const renderPreview = (props: {
  change: ReturnType<typeof makeDetail>;
  currentChange?: ReturnType<typeof makeDetail>;
  previousChange?: ReturnType<typeof makeDetail>;
  features?: { restore?: boolean };
}) => {
  const adapter = {
    listChanges: jest.fn(),
    getChange: jest.fn(),
    ...(props.features?.restore ? { restoreChange: jest.fn() } : {}),
  };

  return render(
    <I18nProvider>
      <ChangeHistoryProvider
        objectId="workflow-1"
        adapter={adapter}
        features={props.features}
        renderPreview={(previewProps) => renderWorkflowChangeHistoryPreview(previewProps)}
      >
        <div data-test-subj="previewHost">
          {renderWorkflowChangeHistoryPreview({
            objectId: 'workflow-1',
            change: props.change,
            currentChange: props.currentChange,
            previousChange: props.previousChange,
          })}
        </div>
      </ChangeHistoryProvider>
    </I18nProvider>
  );
};

describe('workflow change history preview compare', () => {
  it('defaults to compare against current when restore is enabled and selection is not current', async () => {
    renderPreview({
      change: makeDetail('evt-3', 'name: historical\n'),
      currentChange: makeDetail('evt-7', 'name: current\n', { isCurrent: true }),
      features: { restore: true },
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowChangeHistoryYamlDiff')).toBeInTheDocument();
    });
  });

  it('compares against the previous version in browse mode', async () => {
    renderPreview({
      change: makeDetail('evt-3', 'name: middle\n'),
      previousChange: makeDetail('evt-1', 'name: oldest\n'),
      features: { restore: false },
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowChangeHistoryYamlDiff')).toBeInTheDocument();
    });
  });

  it('switches to previous-version compare from settings', async () => {
    renderPreview({
      change: makeDetail('evt-3', 'name: middle\n'),
      currentChange: makeDetail('evt-7', 'name: current\n', { isCurrent: true }),
      previousChange: makeDetail('evt-1', 'name: oldest\n'),
      features: { restore: true },
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowChangeHistoryYamlDiff')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('workflowChangeHistoryCompareSettings'));
    fireEvent.click(screen.getByText('Previous version'));

    await waitFor(() => {
      expect(screen.getByTestId('workflowChangeHistoryYamlDiff')).toBeInTheDocument();
    });
  });

  it('renders read-only yaml when the selected row is current and has no previous version', () => {
    renderPreview({
      change: makeDetail('evt-7', 'name: current\n', { isCurrent: true }),
      features: { restore: true },
    });

    expect(screen.getByTestId('workflowChangeHistoryYamlPreview')).toHaveTextContent(
      'name: current'
    );
    expect(screen.queryByTestId('workflowChangeHistoryYamlDiff')).not.toBeInTheDocument();
  });
});
