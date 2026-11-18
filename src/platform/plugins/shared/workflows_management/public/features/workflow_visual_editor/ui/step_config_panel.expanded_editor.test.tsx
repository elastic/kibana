/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
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

const connectors = [
  {
    type: 'sample',
    hasConnectorId: false,
    paramsSchema: z.object({
      // `body` is a JSON field; `index` takes one string or a list of strings, so a list that holds
      // anything else is not tags and is edited as JSON.
      body: z.record(z.string(), z.unknown()).optional(),
      index: z.union([z.string(), z.array(z.string())]).optional(),
    }),
    outputSchema: z.unknown(),
    summary: 'Sample',
    description: null,
  } as unknown as ConnectorContractUnion,
];

const FRAGMENT =
  'name: sample\ntype: sample\nwith:\n  body:\n    a: 1\n  index:\n    - 1\n    - 2\n';

const renderPanel = () => {
  const onFragmentChange = jest.fn();
  render(
    <Provider store={createMockStore()}>
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="sample"
          initialFragment={FRAGMENT}
          connectors={connectors}
          onClose={jest.fn()}
          onRevert={jest.fn()}
          onFragmentChange={onFragmentChange}
        />
      </I18nProvider>
    </Provider>
  );
  return {
    written: (): Record<string, unknown> =>
      parseDocument(onFragmentChange.mock.calls.at(-1)?.[0] ?? '').toJS(),
  };
};

const expandField = (key: string) => {
  const row = screen.getByTestId(`workflowStepConfigField-with.${key}`).closest('.euiFormRow');
  expect(row).not.toBeNull();
  fireEvent.click(within(row as HTMLElement).getByTestId('workflowStepConfigDataReferenceExpand'));
  return screen.getByTestId('workflowFieldEditorSubFlyoutTextarea') as HTMLTextAreaElement;
};

describe('StepConfigPanel expanded editor', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
  });

  describe('a JSON field', () => {
    it('keeps the text as typed while the value it stands for is written to the step', () => {
      const { written } = renderPanel();
      const editor = expandField('body');
      expect(editor).toHaveValue('{\n  "a": 1\n}');

      fireEvent.change(editor, { target: { value: '{"b":2}' } });

      expect(editor).toHaveValue('{"b":2}');
      expect(written()).toMatchObject({ with: { body: { b: 2 } } });
    });

    it('keeps a typed JSON string with its quotes', () => {
      const { written } = renderPanel();
      const editor = expandField('body');

      fireEvent.change(editor, { target: { value: '"x"' } });

      expect(editor).toHaveValue('"x"');
      expect(written()).toMatchObject({ with: { body: 'x' } });
    });

    it('keeps whitespace typed into an emptied editor', () => {
      const { written } = renderPanel();
      const editor = expandField('body');

      fireEvent.change(editor, { target: { value: '\n' } });

      expect(editor).toHaveValue('\n');
      expect((written().with as Record<string, unknown>).body).toBeUndefined();
    });

    it('shows the value the step has when it changes to something the draft does not say', () => {
      const { written } = renderPanel();
      const editor = expandField('body');
      fireEvent.change(editor, { target: { value: '{"b":2}' } });

      fireEvent.change(editor, { target: { value: '{"b":2' } });

      // Still the last valid value in the step, and the half-typed draft in the editor.
      expect(editor).toHaveValue('{"b":2');
      expect(written()).toMatchObject({ with: { body: { b: 2 } } });
    });
  });

  describe('a list that is not made of strings', () => {
    it('opens as JSON, not as the list joined into one string', () => {
      renderPanel();

      expect(expandField('index')).toHaveValue('[\n  1,\n  2\n]');
    });

    it('writes the edit back as a list, not as a string', () => {
      const { written } = renderPanel();
      const editor = expandField('index');

      fireEvent.change(editor, { target: { value: '[1, 2, 3]' } });

      expect(editor).toHaveValue('[1, 2, 3]');
      expect(written()).toMatchObject({ with: { index: [1, 2, 3] } });
    });
  });
});
