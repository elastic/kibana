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

/** One param of every simple kind, all optional, so each is revealed by the value it holds. */
const connectors = [
  {
    type: 'sample',
    hasConnectorId: false,
    paramsSchema: z.object({
      text: z.string().optional(),
      count: z.number().optional(),
      flag: z.boolean().optional(),
      method: z.enum(['GET', 'POST']).optional(),
      query: z.record(z.string(), z.unknown()).optional(),
      labels: z.record(z.string(), z.string()).optional(),
    }),
    outputSchema: z.unknown(),
    summary: 'Sample',
    description: null,
  } as unknown as ConnectorContractUnion,
];

const FRAGMENT = `name: sample
type: sample
with:
  text: hello
  count: 5
  flag: true
  method: POST
  query:
    a: 1
  labels:
    env: prod
`;

const field = (key: string) => `workflowStepConfigField-with.${key}`;

const activate = (testId: string): HTMLElement => {
  const element = screen.getByTestId(testId);
  if (element.getAttribute('data-mode') === 'read') fireEvent.focusIn(element);
  return screen.getByTestId(testId);
};

const renderPanel = (initialFragment = FRAGMENT) => {
  const onFragmentChange = jest.fn();
  render(
    <StepConfigPanel
      mode="edit"
      stepType="sample"
      initialFragment={initialFragment}
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
  /** The step as the form last wrote it. */
  const written = (): Record<string, unknown> =>
    parseDocument(onFragmentChange.mock.calls.at(-1)?.[0] ?? '').toJS();
  const writtenWith = (): Record<string, unknown> => written().with as Record<string, unknown>;
  return { onFragmentChange, written, writtenWith };
};

describe('StepConfigPanel values round trip', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
  });

  describe('what each kind shows for a stored value', () => {
    it('text', () => {
      renderPanel();
      expect(activate(field('text'))).toHaveValue('hello');
    });

    it('number', () => {
      renderPanel();
      expect(screen.getByTestId(field('count'))).toHaveValue(5);
    });

    it('boolean', () => {
      renderPanel();
      expect(screen.getByTestId(field('flag'))).toBeChecked();
    });

    it('select', () => {
      renderPanel();
      expect(
        within(screen.getByTestId(field('method'))).getByTestId('comboBoxSearchInput')
      ).toHaveValue('POST');
    });

    it('a JSON object, on one line', () => {
      renderPanel();
      expect(activate(field('query'))).toHaveValue('{ "a": 1 }');
    });

    it('a map of text, as name and value rows', () => {
      renderPanel();
      expect(activate(`${field('labels')}-value-0`)).toHaveValue('prod');
      expect(screen.getByTestId(`${field('labels')}-key-0`)).toHaveValue('env');
    });
  });

  describe('what each kind writes', () => {
    it('text: the typed text', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(activate(field('text')), { target: { value: 'bye' } });
      expect(writtenWith().text).toBe('bye');
    });

    it('text: nothing but that key changes', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(activate(field('text')), { target: { value: 'bye' } });
      expect(writtenWith()).toEqual({
        text: 'bye',
        count: 5,
        flag: true,
        method: 'POST',
        query: { a: 1 },
        labels: { env: 'prod' },
      });
    });

    it('text: clearing keeps the key as an empty string; only Remove deletes it', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(activate(field('text')), { target: { value: '' } });
      expect(writtenWith()).toHaveProperty('text', '');
    });

    it('number: a number, not a string', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(screen.getByTestId(field('count')), { target: { value: '7' } });
      expect(writtenWith().count).toBe(7);
    });

    it('number: clearing an optional removes its key', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(screen.getByTestId(field('count')), { target: { value: '' } });
      expect(writtenWith()).not.toHaveProperty('count');
    });

    it('boolean: a boolean', () => {
      const { writtenWith } = renderPanel();
      fireEvent.click(screen.getByTestId(field('flag')));
      expect(writtenWith().flag).toBe(false);
    });

    it('JSON: the parsed value, not the text', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(activate(field('query')), { target: { value: '{"a": 2, "b": [1]}' } });
      expect(writtenWith().query).toEqual({ a: 2, b: [1] });
    });

    it('JSON: keeps the last valid value while the draft is not valid JSON', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(activate(field('query')), { target: { value: '{"a": 2}' } });
      fireEvent.change(activate(field('query')), { target: { value: '{"a": ' } });
      expect(writtenWith().query).toEqual({ a: 2 });
    });

    it('map: the edited value under its name', () => {
      const { writtenWith } = renderPanel();
      fireEvent.change(activate(`${field('labels')}-value-0`), { target: { value: 'dev' } });
      expect(writtenWith().labels).toEqual({ env: 'dev' });
    });
  });

  describe('what the form leaves alone', () => {
    it('keeps unknown keys, and comments, that the form does not own', () => {
      const { onFragmentChange } = renderPanel(
        'name: sample # keep me\ntype: sample\nx-owner: team-a\nwith:\n  text: hello\n'
      );
      fireEvent.change(activate(field('text')), { target: { value: 'bye' } });
      const [last] = onFragmentChange.mock.calls.at(-1) ?? [''];
      expect(last).toContain('# keep me');
      expect(last).toContain('x-owner: team-a');
      expect(last).toContain('text: bye');
    });
  });
});
