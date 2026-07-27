/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowVisualEditorFlyoutTarget } from './workflow_visual_editor_flyout';
import { WorkflowVisualEditorFlyout } from './workflow_visual_editor_flyout';

jest.mock('../../hooks/use_workflows_monaco_theme', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value }: any) => <div data-test-subj="editorValue">{value}</div>,
}));

const renderFlyout = (target: WorkflowVisualEditorFlyoutTarget) =>
  render(
    <I18nProvider>
      <WorkflowVisualEditorFlyout
        target={target}
        editorYaml=""
        canExecuteWorkflow={true}
        isYamlValid={true}
        onClose={jest.fn()}
        // Bypasses TypeIcon, which requires a WorkflowsUiServicesProvider not
        // needed to test the title's deslugify behavior.
        renderStepIcon={() => null}
      />
    </I18nProvider>
  );

describe('WorkflowVisualEditorFlyout title', () => {
  it('deslugifies a step name for display', () => {
    renderFlyout({ kind: 'step', stepName: 'send_slack_message', yamlSnippet: '' });
    expect(screen.getByText('Send Slack Message')).toBeInTheDocument();
  });

  it('restores tech acronyms to all-caps when deslugifying', () => {
    renderFlyout({ kind: 'step', stepName: 'http_request', yamlSnippet: '' });
    expect(screen.getByText('HTTP Request')).toBeInTheDocument();
  });

  it('prefers stepInfo.stepId over stepName, deslugified the same way', () => {
    renderFlyout({
      kind: 'step',
      stepName: 'fallback-name',
      stepInfo: { stepId: 'fetch-data', stepType: 'http', lineStart: 1, lineEnd: 1 } as any,
      yamlSnippet: '',
    });
    expect(screen.getByText('Fetch Data')).toBeInTheDocument();
  });

  it('leaves an already human-readable trigger label untouched', () => {
    renderFlyout({
      kind: 'trigger',
      triggerType: 'manual',
      triggerLabel: 'Manual',
      yamlSnippet: '',
    });
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});
