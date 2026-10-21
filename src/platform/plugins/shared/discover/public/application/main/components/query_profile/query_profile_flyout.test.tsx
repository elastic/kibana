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
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { QueryProfileFlyout } from './query_profile_flyout';

const profileView = aggregateEsqlProfile({
  query: { took_millis: 2_000 },
  planning: { took_millis: 500 },
  parsing: { took_millis: 40 },
  drivers: [
    {
      description: 'data',
      node_name: 'node-a',
      operators: [
        {
          operator: 'ValuesSourceReaderOperator[fields = [body]]',
          status: {
            process_nanos: 1_000_000_000,
            rows_received: 10,
            rows_emitted: 4,
            bytes_read: 5_000_000,
            bytes_decoded: 80_000_000,
          },
        },
      ],
    },
  ],
  plans: [{ node_name: 'node-a', plan: 'LimitExec' }],
});

describe('QueryProfileFlyout', () => {
  const renderFlyout = () =>
    render(
      <EuiProvider>
        <I18nProvider>
          <QueryProfileFlyout loadProfile={() => Promise.resolve(profileView)} />
        </I18nProvider>
      </EuiProvider>
    );

  it('shows the duration split and a reader row', async () => {
    renderFlyout();

    expect(await screen.findByTestId('discoverQueryProfileDuration')).toHaveTextContent('2 s');
    expect(screen.getByText('Planning 500 ms')).toBeInTheDocument();
    expect(screen.getByText('Execution 1.5 s')).toBeInTheDocument();

    const operator = screen.getByTestId('discoverQueryProfileOperator');
    expect(operator).toHaveTextContent('ValuesSourceReader');
    expect(operator).toHaveTextContent('[fields = [body]]');
    expect(operator).toHaveTextContent('100%');
    expect(operator).toHaveTextContent('10 in, 4 out');
    expect(operator).toHaveTextContent('5 MB stored, 80 MB decoded');
    expect(operator).toHaveTextContent('80 MB/s');
  });

  it('expands a row to the per-driver status', async () => {
    renderFlyout();

    fireEvent.click(await screen.findByRole('button', { name: /ValuesSourceReader/ }));

    await waitFor(() => {
      expect(screen.getByTestId('discoverQueryProfileOperatorDetails')).toHaveTextContent(
        'data · node-a'
      );
    });
  });
});
