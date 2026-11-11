/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { HttpStart } from '@kbn/core/public';
import { EsqlErrorHelp } from './esql_error_help';

const buildHttp = ({ response, failure }: { response?: unknown; failure?: unknown }) => ({
  post: jest.fn(() => (failure ? Promise.reject(failure) : Promise.resolve(response))),
});

const renderHelp = (
  http: ReturnType<typeof buildHttp>,
  props: Partial<React.ComponentProps<typeof EsqlErrorHelp>> = {}
) =>
  renderWithI18n(
    <EsqlErrorHelp
      http={http as unknown as HttpStart}
      query="FROM logs | STATS COUNT(*) BY host"
      errorMessage="circuit_breaking_exception - Data too large"
      {...props}
    />
  );

describe('EsqlErrorHelp', () => {
  it('sends the query and the error, and shows the summary and suggestions', async () => {
    const http = buildHttp({
      response: {
        summary: 'The cluster ran out of memory.',
        suggestions: ['Narrow the time range.', 'Use a bigger instance.'],
        query: null,
      },
    });
    renderHelp(http);

    await userEvent.click(await screen.findByTestId('discoverErrorExplainButton'));

    expect(await screen.findByTestId('discoverErrorExplanationSummary')).toHaveTextContent(
      'The cluster ran out of memory.'
    );
    expect(screen.getByTestId('discoverErrorExplanationSuggestions')).toHaveTextContent(
      'Use a bigger instance.'
    );
    expect(screen.queryByTestId('discoverErrorExplanationApply')).not.toBeInTheDocument();
    expect(
      JSON.parse((http.post.mock.calls[0] as unknown as [string, { body: string }])[1].body)
    ).toEqual({
      queryString: 'FROM logs | STATS COUNT(*) BY host',
      errorMessage: 'circuit_breaking_exception - Data too large',
    });
  });

  it('applies a corrected query', async () => {
    const onApplyQuery = jest.fn();
    const http = buildHttp({
      response: {
        summary: 'The field is named hostname.',
        suggestions: [],
        query: 'FROM logs | STATS COUNT(*) BY hostname',
      },
    });
    renderHelp(http, { onApplyQuery });

    await userEvent.click(await screen.findByTestId('discoverErrorExplainButton'));
    await userEvent.click(await screen.findByTestId('discoverErrorExplanationApply'));

    expect(onApplyQuery).toHaveBeenCalledWith('FROM logs | STATS COUNT(*) BY hostname');
  });

  it('shows the failure and lets the user dismiss it', async () => {
    const http = buildHttp({ failure: { body: { message: 'No AI connector available.' } } });
    renderHelp(http);

    await userEvent.click(await screen.findByTestId('discoverErrorExplainButton'));

    expect(await screen.findByTestId('discoverErrorExplanationFailure')).toHaveTextContent(
      'No AI connector available.'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.getByTestId('discoverErrorExplainButton')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverErrorExplanationFailure')).not.toBeInTheDocument();
  });

  it('goes back to the button when the error changes', async () => {
    const http = buildHttp({
      response: { summary: 'Too big.', suggestions: [], query: null },
    });
    const { rerender } = renderHelp(http);

    await userEvent.click(await screen.findByTestId('discoverErrorExplainButton'));
    await screen.findByTestId('discoverErrorExplanationSummary');

    rerender(
      <I18nProvider>
        <EsqlErrorHelp
          http={http as unknown as HttpStart}
          query="FROM logs"
          errorMessage="Unknown column [x]"
        />
      </I18nProvider>
    );

    expect(await screen.findByTestId('discoverErrorExplainButton')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverErrorExplanationSummary')).not.toBeInTheDocument();
  });
});
