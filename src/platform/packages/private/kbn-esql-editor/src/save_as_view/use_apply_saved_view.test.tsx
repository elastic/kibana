/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { getViews } from '@kbn/esql-utils';
import { EsqlEditorActionsProvider } from '../editor_actions_context';
import { EsqlEditorActionsRegister } from '../editor_actions_register';
import { useApplySavedView } from './use_apply_saved_view';

jest.mock('@kbn/esql-utils', () => {
  const actual = jest.requireActual('@kbn/esql-utils');
  return {
    ...actual,
    getViews: jest.fn(),
  };
});

const renderProbe = (viewName: string, submitEsqlQuery = jest.fn()) => {
  const Harness = () => {
    const applySavedView = useApplySavedView();
    return (
      <button type="button" onClick={() => applySavedView(viewName)}>
        Apply
      </button>
    );
  };

  render(
    <KibanaContextProvider services={{ core: coreMock.createStart() }}>
      <EsqlEditorActionsProvider>
        <EsqlEditorActionsRegister submitEsqlQuery={submitEsqlQuery} />
        <Harness />
      </EsqlEditorActionsProvider>
    </KibanaContextProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  return submitEsqlQuery;
};

describe('useApplySavedView', () => {
  beforeEach(() => {
    jest.mocked(getViews).mockReset();
    jest.mocked(getViews).mockResolvedValue({ views: [] });
  });

  it('refreshes the views cache, then runs FROM the saved view', async () => {
    const events: string[] = [];
    jest.mocked(getViews).mockImplementation(function (this: { forceRefresh?: boolean } | void) {
      events.push(this?.forceRefresh ? 'refresh' : 'fetch');
      return Promise.resolve({ views: [] });
    });
    const submitEsqlQuery = jest.fn(() => {
      events.push('submit');
    });

    renderProbe('sales.view', submitEsqlQuery);

    await waitFor(() => expect(submitEsqlQuery).toHaveBeenCalledWith('FROM sales.view'));
    expect(events).toEqual(['refresh', 'submit']);
  });

  it('quotes a view name the ES|QL lexer cannot read unquoted', async () => {
    const submitEsqlQuery = renderProbe('sales=2026');

    await waitFor(() => expect(submitEsqlQuery).toHaveBeenCalledWith('FROM "sales=2026"'));
  });

  it('still runs the view query when the cache refresh fails', async () => {
    jest.mocked(getViews).mockRejectedValue(new Error('unavailable'));
    const submitEsqlQuery = renderProbe('sales.view');

    await waitFor(() => expect(submitEsqlQuery).toHaveBeenCalledWith('FROM sales.view'));
  });
});
