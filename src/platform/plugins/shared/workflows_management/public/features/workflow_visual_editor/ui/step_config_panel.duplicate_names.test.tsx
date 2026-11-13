/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { resetStepConfigPanelSessionStateForTests, StepConfigPanel } from './step_config_panel';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';

jest.mock('@kbn/code-editor', () =>
  jest.requireActual('../test_utils/mock_code_editor').createCodeEditorModuleMock()
);
jest.mock('@kbn/monaco', () => ({
  XJSON_LANG_ID: 'xjson',
  YAML_LANG_ID: 'yaml',
  ESQL_LANG_ID: 'esql',
}));
jest.mock('@kbn/workflows-ui', () =>
  jest.requireActual('../test_utils/mock_workflows_ui').createWorkflowsUiModuleMock()
);
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => null,
}));
jest.mock('../model/use_step_output_samples', () => ({
  useStepOutputSamples: () => ({ byStep: {}, isFullRunInProgress: false }),
}));

const FRAGMENT = 'name: me\ntype: console\nwith:\n  message: hi\n';

const dupStep = { name: 'dup', type: 'console', with: { message: 'x' } };

/** The workflow that holds the step being edited, plus `dup` inside the given container. */
const definitionWith = (container: Record<string, unknown>): WorkflowYaml =>
  ({
    version: '1',
    name: 'demo',
    enabled: true,
    triggers: [{ type: 'manual' }],
    steps: [
      { name: 'me', type: 'console', with: { message: 'hi' } },
      { name: 'owner', type: 'if', condition: 'true', steps: [], ...container },
    ],
  } as unknown as WorkflowYaml);

const renderPanel = (workflowDefinition: WorkflowYaml) =>
  render(
    <Provider store={createMockStore()}>
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="console"
          initialFragment={FRAGMENT}
          connectors={[]}
          workflowDefinition={workflowDefinition}
          onClose={jest.fn()}
          onRevert={jest.fn()}
        />
      </I18nProvider>
    </Provider>
  );

const renameTo = (name: string) => {
  fireEvent.click(screen.getByTestId('workflowStepConfigPanelTitle'));
  const input = screen.getByTestId('workflowStepConfigPanelNameInput');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('StepConfigPanel step name uniqueness', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
  });

  describe.each([
    ['the body of a step (steps)', { steps: [dupStep] }],
    ['an else branch', { else: [dupStep] }],
    ['a switch case', { cases: [{ match: 'a', steps: [dupStep] }] }],
    ['a switch default', { default: [dupStep] }],
    ['a parallel branch', { branches: [{ name: 'b', steps: [dupStep] }] }],
    ['an on-failure fallback', { 'on-failure': { fallback: [dupStep] } }],
    ['a loop iteration fallback', { 'iteration-on-failure': { fallback: [dupStep] } }],
  ])('a step inside %s', (_label, container) => {
    it('blocks renaming another step to its name', () => {
      renderPanel(definitionWith(container));
      renameTo('dup');
      expect(screen.getByTestId('workflowStepConfigPanelNameError')).toHaveTextContent(
        'A step named "dup" already exists'
      );
      expect(screen.getByTestId('workflowStepConfigPanelNameInput')).toBeInTheDocument();
    });
  });

  it('accepts a name no step has', () => {
    renderPanel(definitionWith({ steps: [dupStep] }));
    renameTo('fresh');
    expect(screen.queryByTestId('workflowStepConfigPanelNameError')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('fresh');
  });

  it('accepts the name the step already has', () => {
    renderPanel(definitionWith({ steps: [dupStep] }));
    renameTo('me');
    expect(screen.queryByTestId('workflowStepConfigPanelNameError')).not.toBeInTheDocument();
  });

  it('does not count data that merely looks like a step', () => {
    renderPanel(definitionWith({ with: { name: 'dup', type: 'console' } }));
    renameTo('dup');
    expect(screen.queryByTestId('workflowStepConfigPanelNameError')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('dup');
  });
});
