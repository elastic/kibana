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

/** A step with `fieldCount` text params, all valued, so every one is on screen. */
const stepOf = (fieldCount: number) => {
  const keys = Array.from({ length: fieldCount }, (_, index) => `field${index}`);
  const connector = {
    type: 'sample',
    hasConnectorId: false,
    paramsSchema: z.object(Object.fromEntries(keys.map((key) => [key, z.string().optional()]))),
    outputSchema: z.unknown(),
    summary: 'Sample',
    description: null,
  } as unknown as ConnectorContractUnion;
  const fragment = `name: sample\ntype: sample\nwith:\n${keys
    .map((key) => `  ${key}: value`)
    .join('\n')}\n`;
  return { connector, fragment };
};

const activate = (testId: string): HTMLElement => {
  const element = screen.getByTestId(testId);
  if (element.getAttribute('data-mode') === 'read') fireEvent.focusIn(element);
  return screen.getByTestId(testId);
};

/** Parses caused by one keystroke in the first field of a step with `fieldCount` fields. */
const parsesPerKeystroke = (fieldCount: number): number => {
  const { connector, fragment } = stepOf(fieldCount);
  render(
    <StepConfigPanel
      mode="edit"
      stepType="sample"
      initialFragment={fragment}
      connectors={[connector]}
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
  const field = activate('workflowStepConfigField-with.field0');
  const before = parseCount();
  fireEvent.change(field, { target: { value: 'typed' } });
  return parseCount() - before;
};

describe('StepConfigPanel parses the step once per change', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
    (parseDocument as unknown as jest.Mock).mockClear();
  });

  it('parses at most twice for one keystroke: once to write the edit, once to read the result', () => {
    expect(parsesPerKeystroke(3)).toBeLessThanOrEqual(2);
  });

  it('does not parse more for a step with many fields', () => {
    const few = parsesPerKeystroke(3);
    (parseDocument as unknown as jest.Mock).mockClear();
    document.body.innerHTML = '';
    const many = parsesPerKeystroke(12);
    expect(many).toBeLessThanOrEqual(few);
  });
});
