/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FetchContext } from '@kbn/presentation-publishing';
import type {
  CapabilityNodeOf,
  CapabilityViewProps as CustomAppCapabilityViewProps,
} from '@kbn/custom-app-registry';
import type { esqlEditorCapability } from '../../../common/custom_app/esql_editor/manifest';
import { EsqlEditorView } from './view';

jest.mock('../../create_editor', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (next: { esql: string }) => void;
  }) => (
    <textarea
      aria-label="ES|QL query"
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

type Node = CapabilityNodeOf<typeof esqlEditorCapability>;

const context = { timeRange: { from: 'now-15m', to: 'now' } } as FetchContext;

const setup = (
  node: Partial<Node> = {},
  overrides: Partial<CustomAppCapabilityViewProps<Node>> = {}
) => {
  const runQuery = jest.fn();
  const setValue = jest.fn();
  render(
    <EsqlEditorView
      node={{ type: 'esql_editor', id: 'explore', query: 'FROM a', ...node } as Node}
      text={(value) => value}
      context={context}
      state={{}}
      runQuery={runQuery}
      setValue={setValue}
      source={undefined}
      esqlVariables={undefined}
      runActions={jest.fn()}
      retry={jest.fn()}
      {...overrides}
    />
  );
  return { runQuery, setValue };
};

describe('the ES|QL editor', () => {
  it('starts with the query of the document and runs nothing until it is asked to', async () => {
    const { runQuery } = setup({ title: 'Explore' });

    expect(await screen.findByRole('textbox', { name: 'ES|QL query' })).toHaveValue('FROM a');
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('runs what is written and shows what comes back', async () => {
    const { runQuery } = setup();
    runQuery.mockResolvedValue({
      columns: [{ name: 'host', type: 'keyword' }],
      rows: [['web-1'], ['web-2']],
    });

    await userEvent.click(screen.getByTestId('customAppEsqlEditorRun'));

    expect(await screen.findByText('web-2')).toBeInTheDocument();
    expect(runQuery).toHaveBeenCalledWith('FROM a', expect.any(AbortSignal));
  });

  it('runs what was typed, not what the document started with', async () => {
    const { runQuery } = setup();
    runQuery.mockResolvedValue({ columns: [], rows: [] });

    const editor = screen.getByRole('textbox', { name: 'ES|QL query' });
    await userEvent.clear(editor);
    await userEvent.type(editor, 'FROM b');
    await userEvent.click(screen.getByTestId('customAppEsqlEditorRun'));

    await waitFor(() => expect(runQuery).toHaveBeenCalledWith('FROM b', expect.anything()));
    expect(await screen.findByText('The query returned no rows.')).toBeInTheDocument();
  });

  it('says why a query could not run', async () => {
    const { runQuery } = setup({ query: 'FROM nope' });
    runQuery.mockRejectedValue(new Error('Unknown index [nope]'));

    await userEvent.click(screen.getByTestId('customAppEsqlEditorRun'));

    expect(await screen.findByText('Unknown index [nope]')).toBeInTheDocument();
    expect(screen.getByText('The query could not run')).toBeInTheDocument();
  });

  it('does not run an empty query, or before the page says what to look at', () => {
    setup({ query: '' });
    expect(screen.getByTestId('customAppEsqlEditorRun')).toBeDisabled();
  });

  it('waits for the page to say what to look at', () => {
    setup({}, { context: undefined });
    expect(screen.getByTestId('customAppEsqlEditorRun')).toBeDisabled();
  });

  it('keeps the text in the value of the app it is bound to', async () => {
    const { setValue } = setup({ query: '', bind: 'text' });

    await userEvent.type(screen.getByRole('textbox', { name: 'ES|QL query' }), 'ROW a = 1');

    await waitFor(() => expect(setValue).toHaveBeenCalledWith('text', 'ROW a = 1'));
  });
});
