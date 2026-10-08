/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { ExecuteScript } from '../../types';
import { TestScript } from './test_script';

const indexPattern = createStubDataView({
  spec: {
    title: 'test-data-view',
    fields: {
      bytes: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
    },
  },
});

const SCRIPT = "doc['bytes'].value * 2";

const services = {
  uiSettings: { get: jest.fn() },
  http: {},
  data: { query: { queryString: { getDefaultQuery: () => ({ query: '', language: 'kuery' }) } } },
  unifiedSearch: {
    ui: {
      // Renders the custom submit button the way the search bar does: submitting runs the query
      SearchBar: ({
        customSubmitButton,
        onQuerySubmit,
      }: {
        customSubmitButton: React.ReactElement;
        onQuerySubmit: (payload: { query: { query: string; language: string } }) => void;
      }) =>
        React.cloneElement(customSubmitButton, {
          onClick: () => onQuerySubmit({ query: { query: '', language: 'kuery' } }),
        }),
    },
  },
};

const renderTestScript = (executeScript: jest.MockedFunction<ExecuteScript>) =>
  renderWithI18n(
    <KibanaContextProvider services={services}>
      <TestScript
        indexPattern={indexPattern}
        lang="painless"
        name="myScriptedField"
        script={SCRIPT}
        executeScript={executeScript}
      />
    </KibanaContextProvider>
  );

describe('TestScript', () => {
  it('shows the error body when the script response is not a 200', async () => {
    const executeScript = jest.fn().mockResolvedValue({
      status: 400,
      error: { type: 'search_phase_execution_exception', reason: 'compile error' },
    });

    renderTestScript(executeScript);

    expect(await screen.findByText("There's an error in your script")).toBeVisible();
    const preview = screen.getByTestId('scriptedFieldPreview');
    expect(preview).toHaveTextContent('search_phase_execution_exception');
    expect(preview).toHaveTextContent('compile error');
  });

  it('shows the hits when the script runs successfully', async () => {
    const executeScript = jest.fn().mockResolvedValue({
      status: 200,
      hits: { hits: [{ _id: 'doc-1', _source: {}, fields: { myScriptedField: [2048] } }] },
    });

    renderTestScript(executeScript);

    const preview = await screen.findByTestId('scriptedFieldPreview');
    expect(preview).toHaveTextContent('"_id": "doc-1"');
    expect(preview).toHaveTextContent('2048');
    expect(screen.queryByText("There's an error in your script")).not.toBeInTheDocument();
    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'myScriptedField',
        script: SCRIPT,
        indexPatternTitle: 'test-data-view',
        additionalFields: [],
      })
    );
  });

  it('sends the selected additional fields and shows them in the results', async () => {
    const executeScript = jest.fn().mockResolvedValue({
      status: 200,
      hits: {
        hits: [{ _id: 'doc-1', _source: { bytes: 1024 }, fields: { myScriptedField: [2048] } }],
      },
    });

    renderTestScript(executeScript);
    await waitFor(() => expect(executeScript).toHaveBeenCalledTimes(1));

    await userEvent.click(
      within(screen.getByTestId('additionalFieldsSelect')).getByRole('combobox')
    );
    await userEvent.click(await screen.findByRole('option', { name: 'bytes' }));
    await userEvent.click(screen.getByTestId('runScriptButton'));

    await waitFor(() => expect(executeScript).toHaveBeenCalledTimes(2));
    expect(executeScript).toHaveBeenLastCalledWith(
      expect.objectContaining({ additionalFields: ['bytes'] })
    );
    expect(await screen.findByTestId('scriptedFieldPreview')).toHaveTextContent('"bytes": 1024');
  });
});
