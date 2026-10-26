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
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';
import type { ISearchStart } from '../../search';
import { getEsqlQueryProfileViewDescription } from '.';
import { QueryProfileView } from './query_profile_view';

const readerProfile = {
  query: { took_millis: 2_000 },
  planning: { took_millis: 500 },
  parsing: { took_millis: 40 },
  drivers: [
    {
      description: 'data',
      node_name: 'node-a',
      operators: [
        {
          operator: 'LimitOperator',
          status: {
            process_nanos: 1_000_000,
            rows_received: 4,
            rows_emitted: 1,
          },
        },
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
};

const timelineProfile = {
  query: { took_millis: 2_000, start_millis: 1_000, stop_millis: 3_000 },
  planning: { took_millis: 500, start_millis: 1_000, stop_millis: 1_500 },
  parsing: { took_millis: 40 },
  drivers: [
    {
      description: 'data',
      node_name: 'node-a',
      start_millis: 1_500,
      stop_millis: 2_200,
      operators: [
        {
          operator: 'LimitOperator',
          status: { process_nanos: 1_000_000, rows_received: 4, rows_emitted: 1 },
        },
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
    {
      description: 'data',
      node_name: 'node-b',
      start_millis: 1_600,
      stop_millis: 2_800,
      operators: [
        {
          operator: 'EvalOperator',
          status: { process_nanos: 2_000_000, rows_received: 1, rows_emitted: 1 },
        },
      ],
    },
  ],
};

const chartProfile = {
  query: { took_millis: 100 },
  planning: { took_millis: 10 },
  drivers: [
    {
      description: 'data',
      operators: [
        {
          operator: 'EvalOperator',
          status: { process_nanos: 2_000_000, rows_received: 1, rows_emitted: 1 },
        },
      ],
    },
  ],
};

function renderView(ui: React.ReactElement) {
  return render(
    <EuiProvider>
      <I18nProvider>{ui}</I18nProvider>
    </EuiProvider>
  );
}

function logRequest(
  adapter: RequestAdapter,
  name: string,
  json: object,
  stats?: RequestStatistics
) {
  const request = adapter.start(name).json(json);
  if (stats) {
    request.stats(stats);
  }
  request.ok({ json: {} });
}

describe('getEsqlQueryProfileViewDescription', () => {
  const view = getEsqlQueryProfileViewDescription(() => ({
    search: {} as ISearchStart,
  }));

  it('shows for an ES|QL request and stays hidden for DSL and SQL', () => {
    const esql = new RequestAdapter();
    logRequest(esql, 'Documents', {
      query: 'FROM logs',
      include_execution_metadata: true,
    });
    expect(view.shouldShow?.({ requests: esql })).toBe(true);

    const dsl = new RequestAdapter();
    logRequest(dsl, 'Documents', { query: { match_all: {} }, size: 10 });
    expect(view.shouldShow?.({ requests: dsl })).toBe(false);

    const sql = new RequestAdapter();
    logRequest(sql, 'Documents', { query: 'SELECT * FROM logs', fetchSize: 10 });
    expect(view.shouldShow?.({ requests: sql })).toBe(false);
    expect(view.shouldShow?.({})).toBe(false);
    expect(view.id).toBe('esqlQueryProfile');
  });
});

describe('QueryProfileView', () => {
  const esql = jest.fn(async ({ query }: { query: string }) => ({
    rawResponse: {
      profile:
        query === 'FROM logs | STATS count()'
          ? chartProfile
          : query === 'FROM timeline'
          ? timelineProfile
          : readerProfile,
    },
  }));
  const search = { esql } as unknown as Pick<ISearchStart, 'esql'>;

  beforeEach(() => {
    esql.mockClear();
  });

  it('shows the duration split, a reader row, and the chevron', async () => {
    const requests = new RequestAdapter();
    logRequest(
      requests,
      'Documents',
      {
        query: 'FROM logs',
        include_execution_metadata: true,
        time_zone: 'UTC',
        filter: { match_all: {} },
        approximation: true,
      },
      { queryTime: { label: 'Query time', value: '15ms' } }
    );

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByTestId('esqlQueryProfileCompletedRequest')).toHaveTextContent(
      'Completed request: 15ms'
    );
    expect(await screen.findByTestId('esqlQueryProfileDuration')).toHaveTextContent('2 s');
    expect(screen.getByText('Profiled run')).toBeInTheDocument();
    expect(screen.getByText('Planning 500 ms')).toBeInTheDocument();
    expect(screen.getByText('Execution 1.5 s')).toBeInTheDocument();

    const reader = screen
      .getAllByTestId('esqlQueryProfileOperator')
      .find((row) => row.textContent?.includes('ValuesSourceReader'));
    expect(reader).toHaveTextContent('ValuesSourceReader');
    expect(reader).not.toHaveTextContent('[fields = [body]]');
    expect(reader).toHaveTextContent('100%');
    expect(reader).toHaveTextContent('10 in, 4 out');
    expect(reader).toHaveTextContent('5 MB stored, 80 MB decoded');
    expect(reader).toHaveTextContent('80 MB/s');
    expect(reader?.querySelector('[data-euiicon-type="chevronSingleRight"]')).toBeInTheDocument();
    expect(reader?.querySelector('[data-euiicon-type="search"]')).toBeInTheDocument();

    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs',
        timeZone: 'UTC',
        filter: { match_all: {} },
      }),
      expect.objectContaining({ profile: true, approximation: true })
    );
  });

  it('expands a row to the per-driver status', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM logs',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    fireEvent.click(await screen.findByRole('button', { name: /ValuesSourceReader/ }));

    await waitFor(() => {
      expect(screen.getByTestId('esqlQueryProfileOperatorDetails')).toHaveTextContent(
        '[fields = [body]]'
      );
      expect(screen.getByTestId('esqlQueryProfileOperatorDetails')).toHaveTextContent(
        'data · node-a'
      );
    });
    const reader = screen
      .getAllByTestId('esqlQueryProfileOperator')
      .find((row) => row.textContent?.includes('ValuesSourceReader'));
    expect(reader?.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();
  });

  it('profiles the request id passed when the inspector opens', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM logs',
      include_execution_metadata: true,
    });
    logRequest(requests, 'Chart', {
      query: 'FROM logs | STATS count()',
      include_execution_metadata: true,
    });
    const chartId = requests.getRequests()[1].id;

    renderView(
      <QueryProfileView
        adapters={{ requests }}
        search={search}
        options={{ initialRequestId: chartId }}
      />
    );

    expect(await screen.findByText('Eval')).toBeInTheDocument();
    expect(screen.queryByText('ValuesSourceReader')).not.toBeInTheDocument();
  });

  it('profiles the request chosen in the picker', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM logs',
      include_execution_metadata: true,
    });
    logRequest(requests, 'Chart', {
      query: 'FROM logs | STATS count()',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByText('ValuesSourceReader')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Request' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Chart' }));

    expect(await screen.findByText('Eval')).toBeInTheDocument();
    expect(screen.queryByText('ValuesSourceReader')).not.toBeInTheDocument();
    expect(esql).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'FROM logs | STATS count()' }),
      expect.objectContaining({ profile: true })
    );
  });

  it('shows operators in plan order', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM logs',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    const operators = await screen.findAllByTestId('esqlQueryProfileOperator');
    expect(operators[0]).toHaveTextContent('Limit');
    expect(operators[1]).toHaveTextContent('ValuesSourceReader');
    expect(screen.queryByRole('button', { name: 'Slowest first' })).not.toBeInTheDocument();
  });

  it('zooms the timeline into a driver and back out', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM timeline',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByTestId('esqlQueryProfileTimeline')).toBeInTheDocument();
    expect(screen.queryByText('Planning 500 ms')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileOperator')).not.toBeInTheDocument();
    expect(laneWidth('data · node-a')).toBeLessThan(100);
    expect(screen.getByRole('button', { name: /node-b/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Planning/ }));
    expect(screen.getByText('Parsing 40 ms')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Full query' }));
    expect(screen.queryByText('Parsing 40 ms')).not.toBeInTheDocument();
    expect(laneWidth('data · node-a')).toBeLessThan(100);

    await userEvent.click(screen.getByRole('button', { name: /node-a/ }));
    expect(laneWidth('data · node-a')).toBe(100);
    const operators = screen.getAllByTestId('esqlQueryProfileOperator');
    expect(operators[0]).toHaveTextContent('Limit');
    expect(operators[1]).toHaveTextContent('ValuesSourceReader');
    expect(screen.queryByText('Eval')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /ValuesSourceReader/ }));
    expect(screen.getByTestId('esqlQueryProfileOperatorDetails')).toHaveTextContent(
      '[fields = [body]]'
    );
    expect(screen.getByTestId('esqlQueryProfileOperatorDetails')).toHaveTextContent(
      'data · node-a'
    );

    expect(screen.getByRole('navigation', { name: 'Timeline zoom' })).toHaveTextContent('node-a');
    await userEvent.click(screen.getByRole('button', { name: 'Full query' }));
    expect(laneWidth('data · node-a')).toBeLessThan(100);
    expect(screen.queryByTestId('esqlQueryProfileOperator')).not.toBeInTheDocument();
  });
});

function laneWidth(label: string): number {
  const bar = document.querySelector(`[data-driver-label="${label}"]`);
  if (!(bar instanceof HTMLElement)) {
    throw new Error(`Missing lane ${label}`);
  }
  return parseFloat(bar.style.width);
}
