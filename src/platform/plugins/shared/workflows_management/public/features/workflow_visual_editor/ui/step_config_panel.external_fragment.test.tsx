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

const connectors = [
  {
    type: 'sample',
    hasConnectorId: false,
    paramsSchema: z.object({
      text: z.string(),
      count: z.number().optional(),
      note: z.string().optional(),
    }),
    outputSchema: z.unknown(),
    summary: 'Sample',
    description: null,
  } as unknown as ConnectorContractUnion,
];

const FRAGMENT = 'name: sample\ntype: sample\nwith:\n  text: hello\n  count: 5\n';
const field = (key: string) => `workflowStepConfigField-with.${key}`;

const activate = (testId: string): HTMLElement => {
  const element = screen.getByTestId(testId);
  if (element.getAttribute('data-mode') === 'read') fireEvent.focusIn(element);
  return screen.getByTestId(testId);
};

const renderPanel = () => {
  const onFragmentChange = jest.fn();
  const props = (syncedFragment?: { readonly fragment: string }) => (
    <StepConfigPanel
      mode="edit"
      stepType="sample"
      initialFragment={FRAGMENT}
      connectors={connectors}
      onClose={jest.fn()}
      onRevert={jest.fn()}
      onFragmentChange={onFragmentChange}
      syncedFragment={syncedFragment}
    />
  );
  const view = render(props(), {
    wrapper: ({ children }) => (
      <Provider store={createMockStore()}>
        <I18nProvider>{children}</I18nProvider>
      </Provider>
    ),
  });
  return {
    onFragmentChange,
    sync: (fragment: string) => view.rerender(props({ fragment })),
    written: (): Record<string, unknown> =>
      parseDocument(onFragmentChange.mock.calls.at(-1)?.[0] ?? '').toJS(),
  };
};

describe('StepConfigPanel with the step changed from outside (undo, YAML tab)', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
  });

  it('shows the values the step now has', () => {
    const { sync } = renderPanel();
    sync('name: sample\ntype: sample\nwith:\n  text: from undo\n  count: 9\n');
    expect(activate(field('text'))).toHaveValue('from undo');
    expect(screen.getByTestId(field('count'))).toHaveValue(9);
  });

  it('builds the next edit on the changed step, so a field the user did not touch is not reverted', () => {
    const { sync, written } = renderPanel();
    sync('name: sample\ntype: sample\nwith:\n  text: hello\n  count: 9\n');

    fireEvent.change(activate(field('text')), { target: { value: 'typed after undo' } });

    expect(written()).toEqual({
      name: 'sample',
      type: 'sample',
      with: { text: 'typed after undo', count: 9 },
    });
  });

  it('adopts a second change that has the same content as the first', () => {
    const { sync } = renderPanel();
    const external = 'name: sample\ntype: sample\nwith:\n  text: again\n  count: 5\n';
    sync(external);
    fireEvent.change(activate(field('text')), { target: { value: 'user typed' } });

    // Undone again, back to text an earlier sync already carried.
    sync(external);

    expect(activate(field('text'))).toHaveValue('again');
  });

  it('keeps what the user opened in the form, instead of resetting it', () => {
    const { sync } = renderPanel();
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.note'));
    expect(screen.getByTestId(field('note'))).toBeInTheDocument();

    sync('name: sample\ntype: sample\nwith:\n  text: from undo\n  count: 5\n');

    // `note` is empty in the step, so only the user's own choice keeps it on screen.
    expect(screen.getByTestId(field('note'))).toBeInTheDocument();
  });

  it('reports the adopted step like any other draft, so the shell can recognise it as applied', () => {
    const { sync, onFragmentChange } = renderPanel();
    const external = 'name: sample\ntype: sample\nwith:\n  text: from undo\n  count: 9\n';
    sync(external);
    expect(onFragmentChange).toHaveBeenLastCalledWith(external);
  });

  it('does nothing without a synced fragment', () => {
    const { onFragmentChange } = renderPanel();
    expect(onFragmentChange).toHaveBeenCalledTimes(1);
    expect(onFragmentChange).toHaveBeenCalledWith(FRAGMENT);
  });
});
