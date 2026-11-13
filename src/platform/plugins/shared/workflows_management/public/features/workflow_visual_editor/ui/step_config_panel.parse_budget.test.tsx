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
import { parseDocument } from 'yaml';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConnectorContractUnion } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
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
// Counts every YAML parse made anywhere in the panel's tree (panel, widgets and shared packages).
jest.mock('yaml', () => {
  const actual = jest.requireActual('yaml');
  return { ...actual, parseDocument: jest.fn((...args) => actual.parseDocument(...args)) };
});

const parseCount = (): number => (parseDocument as unknown as jest.Mock).mock.calls.length;

const connectors = [
  {
    type: 'slack',
    hasConnectorId: 'required',
    paramsSchema: z.object({ message: z.string(), channel: z.string().optional() }),
    outputSchema: z.unknown(),
    summary: 'Slack',
    description: null,
  } as unknown as ConnectorContractUnion,
];

const FRAGMENT = `name: notify
type: slack
connector-id: abc
with:
  message: Hi
  channel: general
`;

const activate = (testId: string): HTMLElement => {
  const element = screen.getByTestId(testId);
  if (element.getAttribute('data-mode') === 'read') fireEvent.focusIn(element);
  return screen.getByTestId(testId);
};

/**
 * Baseline measured before the parse-once refactor: the panel parses the step fragment far more
 * often than it needs to (once per field and per derived value, on every render). These ceilings
 * only stop it getting worse; the refactor adds stricter budgets in new tests beside them.
 */
const MOUNT_PARSE_CEILING = 14;
const KEYSTROKE_PARSE_CEILING = 11;

describe('StepConfigPanel parse budget', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
    (parseDocument as unknown as jest.Mock).mockClear();
  });

  const renderPanel = () =>
    render(
      <StepConfigPanel
        mode="edit"
        stepType="slack"
        initialFragment={FRAGMENT}
        connectors={connectors}
        onClose={jest.fn()}
        onRevert={jest.fn()}
        onFragmentChange={jest.fn()}
      />,
      {
        wrapper: ({ children }) => (
          <Provider store={createMockStore()}>
            <I18nProvider>{children}</I18nProvider>
          </Provider>
        ),
      }
    );

  it('parses the fragment no more than the baseline when it opens', () => {
    renderPanel();
    expect(parseCount()).toBeLessThanOrEqual(MOUNT_PARSE_CEILING);
  });

  it('parses the fragment no more than the baseline for one keystroke', () => {
    renderPanel();
    const field = activate('workflowStepConfigField-with.message');
    const before = parseCount();
    fireEvent.change(field, { target: { value: 'Hi!' } });
    expect(parseCount() - before).toBeLessThanOrEqual(KEYSTROKE_PARSE_CEILING);
  });

  it('still writes the typed value to the fragment', () => {
    const onFragmentChange = jest.fn();
    render(
      <StepConfigPanel
        mode="edit"
        stepType="slack"
        initialFragment={FRAGMENT}
        connectors={connectors}
        onClose={jest.fn()}
        onRevert={jest.fn()}
        onFragmentChange={onFragmentChange}
      />,
      {
        wrapper: ({ children }) => (
          <Provider store={createMockStore()}>
            <I18nProvider>{children}</I18nProvider>
          </Provider>
        ),
      }
    );
    fireEvent.change(activate('workflowStepConfigField-with.message'), {
      target: { value: 'Hi!' },
    });
    expect(onFragmentChange).toHaveBeenLastCalledWith(expect.stringContaining('message: Hi!'));
  });
});
