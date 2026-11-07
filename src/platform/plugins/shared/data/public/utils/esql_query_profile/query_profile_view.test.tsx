/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';
import type { HttpStart } from '@kbn/core/public';
import type { ISearchStart } from '../../search';
import { getEsqlQueryProfileViewDescription } from '.';
import { QueryProfileView } from './query_profile_view';
import { setProfileBaseline } from './profile_baseline';
import { getQueryProfileHeat, setQueryProfileHeat } from './query_heat_store';

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

const waitingProfile = {
  query: { took_millis: 100, start_millis: 1_000, stop_millis: 1_100 },
  planning: { took_millis: 10, start_millis: 1_000, stop_millis: 1_010 },
  drivers: [
    {
      description: 'data',
      node_name: 'node-a',
      start_millis: 1_010,
      stop_millis: 1_090,
      operators: [
        {
          operator: 'LuceneSourceOperator',
          status: { process_nanos: 5_000_000, rows_emitted: 10 },
        },
        // Exchange operators report no time at all.
        { operator: 'ExchangeSinkOperator', status: { rows_received: 10 } },
      ],
    },
    {
      description: 'final',
      node_name: 'node-a',
      start_millis: 1_005,
      stop_millis: 1_100,
      sleeps: {
        counts: { 'exchange empty': 2 },
        first: [
          { reason: 'exchange empty', thread_name: 'T#1', sleep_millis: 1_010, wake_millis: 1_090 },
        ],
        last: [
          { reason: 'exchange empty', thread_name: 'T#1', sleep_millis: 1_010, wake_millis: 1_090 },
        ],
      },
      operators: [{ operator: 'ExchangeSourceOperator', status: { rows_emitted: 10 } }],
    },
  ],
};

const heatQuery = 'FROM heat\n| WHERE a > 1\n| STATS c = COUNT(*) BY a\n| SORT c DESC';

const heatProfile = {
  query: { took_millis: 100, start_millis: 1_000, stop_millis: 1_100 },
  planning: { took_millis: 10, start_millis: 1_000, stop_millis: 1_010 },
  drivers: [
    {
      description: 'data',
      node_name: 'node-a',
      start_millis: 1_010,
      stop_millis: 1_090,
      operators: [
        { operator: 'LuceneSourceOperator', status: { process_nanos: 60_000_000 } },
        { operator: 'HashAggregationOperator', status: { hash_nanos: 30_000_000 } },
        { operator: 'TopNOperator', status: { receive_nanos: 10_000_000 } },
        { operator: 'ExchangeSinkOperator', status: { rows_received: 5 } },
      ],
    },
  ],
};

const subqueryQuery =
  'FROM\n  (FROM a | STATS c = COUNT(*) BY x | STATS t = SUM(c) BY y),\n  (FROM b | STATS t = COUNT(*) BY y)\n| SORT t DESC';

const clock = (index: number) => ({ start_millis: 1_000 + index, stop_millis: 1_050 + index });

// The data drivers of a subquery come right before its final driver, as in a real profile.
const subqueryProfile = {
  query: { took_millis: 100, start_millis: 1_000, stop_millis: 1_100 },
  planning: { took_millis: 10, start_millis: 1_000, stop_millis: 1_010 },
  drivers: [
    {
      description: 'data',
      ...clock(0),
      operators: [{ operator: 'LuceneSourceOperator', status: { process_nanos: 5_000_000 } }],
    },
    {
      description: 'subplan-1.final',
      ...clock(1),
      operators: [{ operator: 'HashAggregationOperator', status: { hash_nanos: 1_000_000 } }],
    },
    {
      description: 'data',
      ...clock(2),
      operators: [
        { operator: 'LuceneSourceOperator', status: { process_nanos: 80_000_000 } },
        { operator: 'HashAggregationOperator', status: { hash_nanos: 10_000_000 } },
      ],
    },
    {
      description: 'subplan-0.final',
      ...clock(3),
      operators: [{ operator: 'HashAggregationOperator', status: { hash_nanos: 3_000_000 } }],
    },
    {
      description: 'main.final',
      ...clock(4),
      operators: [{ operator: 'TopNOperator', status: { receive_nanos: 1_000_000 } }],
    },
  ],
};

const flowProfile = {
  query: { took_millis: 100, start_millis: 1_000, stop_millis: 1_100 },
  planning: { took_millis: 10, start_millis: 1_000, stop_millis: 1_010 },
  drivers: [
    {
      description: 'data',
      ...clock(0),
      operators: [
        {
          operator: 'LuceneSourceOperator',
          status: { process_nanos: 2_000_000, rows_emitted: 100_000 },
        },
        {
          operator: 'HashAggregationOperator',
          status: { hash_nanos: 5_000_000, rows_received: 100_000, rows_emitted: 50 },
        },
        { operator: 'ExchangeSinkOperator', status: { rows_received: 50 } },
      ],
    },
    {
      description: 'final',
      ...clock(1),
      operators: [
        { operator: 'ExchangeSourceOperator', status: { rows_emitted: 50 } },
        {
          operator: 'TopNOperator',
          status: { receive_nanos: 1_000, rows_received: 50, rows_emitted: 10 },
        },
        { operator: 'OutputOperator', status: {} },
      ],
    },
  ],
};

// Five data drivers, four of which finish by 29 ms and one at 46 ms, and a final driver that waits
// for data until then. The query waited for the slow one.
const stragglerProfile = {
  query: { took_millis: 47, start_millis: 1_000, stop_millis: 1_047 },
  planning: { took_millis: 2, start_millis: 1_000, stop_millis: 1_002 },
  drivers: [
    ...[0, 1, 2, 3].map(() => ({
      description: 'data',
      node_name: 'node-a',
      start_millis: 1_002,
      stop_millis: 1_029,
    })),
    { description: 'data', node_name: 'node-a', start_millis: 1_002, stop_millis: 1_046 },
    {
      description: 'final',
      node_name: 'node-a',
      start_millis: 1_001,
      stop_millis: 1_047,
      sleeps: {
        counts: { 'exchange empty': 1 },
        first: [
          { reason: 'exchange empty', thread_name: 'T#1', sleep_millis: 1_016, wake_millis: 1_046 },
        ],
        last: [
          { reason: 'exchange empty', thread_name: 'T#1', sleep_millis: 1_016, wake_millis: 1_046 },
        ],
      },
    },
  ],
};

// Only exchange operators, which report no time, so there is nothing to break down.
const untimedProfile = {
  query: { took_millis: 100, start_millis: 1_000, stop_millis: 1_100 },
  planning: { took_millis: 10, start_millis: 1_000, stop_millis: 1_010 },
  drivers: [
    {
      description: 'data',
      ...clock(0),
      operators: [{ operator: 'ExchangeSinkOperator', status: { rows_received: 5 } }],
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

/** The secondary actions live in an overflow menu, so open it and pick one. */
async function chooseAction(testSubject: string) {
  await userEvent.click(await screen.findByTestId('esqlQueryProfileActions'));
  await userEvent.click(await screen.findByTestId(testSubject));
}

describe('getEsqlQueryProfileViewDescription', () => {
  const view = getEsqlQueryProfileViewDescription(() => ({
    search: {} as ISearchStart,
    http: {} as HttpStart,
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
          : query === 'FROM waiting'
          ? waitingProfile
          : query === heatQuery
          ? heatProfile
          : query === subqueryQuery
          ? subqueryProfile
          : query === 'FROM flow'
          ? flowProfile
          : query === 'FROM untimed'
          ? untimedProfile
          : query === 'FROM straggler'
          ? stragglerProfile
          : readerProfile,
    },
  }));
  const search = { esql } as unknown as Pick<ISearchStart, 'esql'>;

  beforeEach(() => {
    esql.mockClear();
    setProfileBaseline(undefined);
    setQueryProfileHeat(undefined);
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

    expect(await screen.findByTestId('esqlQueryProfileIntro')).toHaveTextContent(
      'The original took 15ms and is unchanged.'
    );
    expect(await screen.findByTestId('esqlQueryProfileDuration')).toHaveTextContent('2 s');
    expect(screen.getByText('Profiled run · 1 driver')).toBeInTheDocument();
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
        profile: true,
        approximation: true,
      }),
      expect.objectContaining({ abortSignal: expect.anything() })
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
      expect.objectContaining({ query: 'FROM logs | STATS count()', profile: true }),
      expect.anything()
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

  it('shows a time ruler and a category legend when a driver is open', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM timeline',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    const ruler = await screen.findByTestId('esqlQueryProfileRuler');
    expect(ruler).toHaveTextContent('0 ms');
    expect(screen.queryByTestId('esqlQueryProfileLegend')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /node-a/ }));
    const legend = screen.getByTestId('esqlQueryProfileLegend');
    expect(legend).toHaveTextContent('Read');
    expect(legend).toHaveTextContent('Filter and limit');
    expect(legend).not.toHaveTextContent('Exchange');
  });

  it('marks only operators that carry real weight in the whole query as hot', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM timeline',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    await userEvent.click(await screen.findByRole('button', { name: /node-a/ }));
    const reader = screen
      .getAllByTestId('esqlQueryProfileOperator')
      .find((row) => row.textContent?.includes('ValuesSourceReader'));
    expect(reader?.querySelector('[data-euiicon-type="temperature"]')).toBeInTheDocument();
    const limit = screen
      .getAllByTestId('esqlQueryProfileOperator')
      .find((row) => row.textContent?.includes('Limit'));
    expect(limit?.querySelector('[data-euiicon-type="temperature"]')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Full query' }));
    await userEvent.click(screen.getByRole('button', { name: /node-b/ }));
    const evalRow = screen.getByTestId('esqlQueryProfileOperator');
    // Eval is 100% of its own driver, but only a sliver of the whole query.
    expect(evalRow).toHaveTextContent('100%');
    expect(evalRow.querySelector('[data-euiicon-type="temperature"]')).not.toBeInTheDocument();
  });

  it('shows waiting segments, a legend and the waited time on a driver lane', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM waiting',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByTestId('esqlQueryProfileTimeline')).toBeInTheDocument();
    expect(screen.getAllByTestId('esqlQueryProfileLaneWaitSegment')).toHaveLength(1);
    expect(screen.getByTestId('esqlQueryProfileTimeline').parentElement).toHaveTextContent(
      'Waiting, for example for another driver to send data'
    );
  });

  it('shows the CPU breakdown and the insights above the timeline', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM timeline',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    const insights = await screen.findAllByTestId('esqlQueryProfileInsight');
    expect(insights[0]).toHaveTextContent('ValuesSourceReader takes');
    expect(insights[0]).toHaveTextContent('of the operator CPU time');
    // The CPU breakdown sits with the timeline, and with the operators on the other tab.
    const breakdown = screen.getByTestId('esqlQueryProfileCpuBreakdown');
    expect(breakdown).toHaveTextContent('Read 100%');
    expect(breakdown).toHaveTextContent('Compute');

    await userEvent.click(screen.getByTestId('esqlQueryProfileOperatorsTab'));
    expect(screen.getByTestId('esqlQueryProfileCpuBreakdown')).toBeInTheDocument();
    // Insights stay above both tabs, and only once.
    expect(screen.getAllByTestId('esqlQueryProfileInsights')).toHaveLength(1);
  });

  it('shows no insights when the profile has nothing worth pointing at', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM logs | STATS count()',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByText('Eval')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileInsights')).not.toBeInTheDocument();
  });

  describe('baseline comparison', () => {
    const twoRequests = () => {
      const requests = new RequestAdapter();
      logRequest(requests, 'Documents', {
        query: 'FROM logs',
        include_execution_metadata: true,
      });
      logRequest(requests, 'Chart', {
        query: 'FROM logs | STATS count()',
        include_execution_metadata: true,
      });
      return requests;
    };

    it('compares another run against the run saved as the baseline', async () => {
      renderView(<QueryProfileView adapters={{ requests: twoRequests() }} search={search} />);

      await chooseAction('esqlQueryProfileSetBaseline');
      expect(screen.getByTestId('esqlQueryProfileIsBaseline')).toBeInTheDocument();
      expect(screen.queryByTestId('esqlQueryProfileComparison')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('combobox', { name: 'Request' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Chart' }));

      expect(await screen.findByTestId('esqlQueryProfileComparison')).toBeInTheDocument();
      // A different query is worth naming, so the baseline query is shown.
      expect(screen.getByTestId('esqlQueryProfileBaselineQuery')).toHaveTextContent('FROM logs');
      expect(screen.getByTestId('esqlQueryProfileComparedTotal')).toHaveTextContent('2 s → 100 ms');
      expect(screen.getByTestId('esqlQueryProfileComparedTotal')).toHaveTextContent('−95%');
      // Only the biggest operator change shows until the details are opened.
      expect(screen.getAllByTestId('esqlQueryProfileComparedOperator')).toHaveLength(1);
      expect(screen.queryByTestId('esqlQueryProfileComparedPlanning')).not.toBeInTheDocument();
      await userEvent.click(screen.getByTestId('esqlQueryProfileComparisonDetails'));
      expect(screen.getByTestId('esqlQueryProfileComparedPlanning')).toBeInTheDocument();
      const operators = screen.getAllByTestId('esqlQueryProfileComparedOperator');
      expect(operators.map((row) => row.textContent)).toEqual([
        expect.stringContaining('ValuesSourceReader'),
        expect.stringContaining('Eval'),
        expect.stringContaining('Limit'),
      ]);
      expect(operators[0]).toHaveTextContent('not in run');
    });

    it('keeps the baseline when the inspector is opened again', async () => {
      const first = renderView(
        <QueryProfileView adapters={{ requests: twoRequests() }} search={search} />
      );
      await chooseAction('esqlQueryProfileSetBaseline');
      first.unmount();

      renderView(<QueryProfileView adapters={{ requests: twoRequests() }} search={search} />);

      // A reopened inspector loads a new run, which is compared with the saved baseline.
      expect(await screen.findByTestId('esqlQueryProfileComparison')).toBeInTheDocument();
      // Same query as the baseline, so repeating it would only add noise.
      expect(screen.queryByTestId('esqlQueryProfileBaselineQuery')).not.toBeInTheDocument();
      expect(screen.getByTestId('esqlQueryProfileComparedTotal')).toHaveTextContent('No change');
    });

    it('runs the profile again and drops the baseline when it is cleared', async () => {
      renderView(<QueryProfileView adapters={{ requests: twoRequests() }} search={search} />);

      await chooseAction('esqlQueryProfileSetBaseline');
      expect(esql).toHaveBeenCalledTimes(1);

      await chooseAction('esqlQueryProfileRunAgain');
      expect(await screen.findByTestId('esqlQueryProfileComparison')).toBeInTheDocument();
      expect(esql).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('esqlQueryProfileComparedTotal')).toHaveTextContent('No change');

      await chooseAction('esqlQueryProfileClearBaseline');
      expect(screen.queryByTestId('esqlQueryProfileComparison')).not.toBeInTheDocument();

      // With no baseline, the menu offers to set one again.
      await userEvent.click(screen.getByTestId('esqlQueryProfileActions'));
      expect(await screen.findByTestId('esqlQueryProfileSetBaseline')).toBeInTheDocument();
    });
  });

  it('puts the views that interpret the profile first and the exact operator list last', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: 'FROM flow', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await screen.findByTestId('esqlQueryProfileBreakdownTab');

    expect(screen.getAllByTestId(/^esqlQueryProfile\w+Tab$/).map((tab) => tab.textContent)).toEqual(
      ['Timeline', 'By command', 'CPU breakdown', 'Operators']
    );

    await userEvent.click(screen.getByTestId('esqlQueryProfileOperatorsTab'));
    expect(screen.getByText(/This list is exact, because nothing is matched/)).toBeInTheDocument();
  });

  it('breaks the CPU time down by node, driver and kind of operator', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: 'FROM flow', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await userEvent.click(await screen.findByTestId('esqlQueryProfileBreakdownTab'));

    expect(screen.getByTestId('esqlQueryProfileCpuSankey')).toBeInTheDocument();
    // Each node says what it is and how much it carries, for screen readers and for the card.
    const labels = screen
      .getAllByTestId('esqlQueryProfileCpuNode')
      .map((node) => node.getAttribute('aria-label') ?? '');
    // Node, driver and kind of operator, one level after the other.
    expect(labels.map((text) => text.split(', ')[0])).toEqual(
      expect.arrayContaining(['Node: cluster', 'Driver: data', 'Driver: final', 'HashAggregation'])
    );
    expect(screen.getByText(/Ribbons are as thick as the time they carry/)).toBeInTheDocument();
    // The rows an operator took in and handed on are in its tooltip.
    const aggregation = labels.find((text) => text.startsWith('HashAggregation')) ?? '';
    expect(aggregation).toContain('Rows in: 100,000');
    expect(aggregation).toContain('Rows out: 50');
    // The label of a tall operator wraps, with its time and share under its name.
    const aggregationNode = screen
      .getAllByTestId('esqlQueryProfileCpuNode')
      .find((node) =>
        node.getAttribute('aria-label')?.startsWith('HashAggregation')
      ) as HTMLElement;
    expect(
      Array.from(aggregationNode.querySelectorAll('text')).map((label) => label.textContent)
    ).toEqual(['HashAggregation', expect.stringMatching(/\d+(\.\d+)? ms · \d+%$/)]);
    // There is nothing to switch between, since this is the only thing the tab shows.
    expect(screen.queryByTestId('esqlQueryProfileFlowRows')).not.toBeInTheDocument();
  });

  it('lights up what a node or a ribbon touches and shows its details while it is pointed at', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: 'FROM flow', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await userEvent.click(await screen.findByTestId('esqlQueryProfileBreakdownTab'));
    expect(screen.queryByTestId('esqlQueryProfileCpuTooltip')).not.toBeInTheDocument();

    const nodeByLabel = (label: string) =>
      screen
        .getAllByTestId('esqlQueryProfileCpuNode')
        .find((node) => node.getAttribute('aria-label')?.startsWith(label)) as HTMLElement;
    await userEvent.hover(nodeByLabel('HashAggregation'));

    const card = screen.getByTestId('esqlQueryProfileCpuTooltip');
    expect(card).toHaveTextContent('HashAggregation');
    expect(card).toHaveTextContent('Rows in: 100,000');
    // The ribbon into the aggregation is lit, and the others fade out.
    const opacities = screen
      .getAllByTestId('esqlQueryProfileCpuLink')
      .map((link) => Number(link.getAttribute('opacity')));
    expect(opacities.filter((opacity) => opacity > 0.5)).toHaveLength(1);
    expect(opacities.filter((opacity) => opacity < 0.1).length).toBeGreaterThan(0);
    // A node the pointer is not at, and that is not connected to it, fades too.
    expect(nodeByLabel('TopN')).toHaveAttribute('opacity', '0.35');

    await userEvent.unhover(nodeByLabel('HashAggregation'));
    expect(screen.queryByTestId('esqlQueryProfileCpuTooltip')).not.toBeInTheDocument();
    expect(nodeByLabel('TopN')).toHaveAttribute('opacity', '1');

    await userEvent.hover(screen.getAllByTestId('esqlQueryProfileCpuLink')[0]);
    expect(screen.getByTestId('esqlQueryProfileCpuTooltip').textContent).toMatch(/→/);
  });

  it('shows the same details to someone using the keyboard', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: 'FROM flow', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await userEvent.click(await screen.findByTestId('esqlQueryProfileBreakdownTab'));

    await act(async () => screen.getAllByTestId('esqlQueryProfileCpuNode')[0].focus());
    expect(screen.getByTestId('esqlQueryProfileCpuTooltip')).toBeInTheDocument();

    await act(async () => screen.getAllByTestId('esqlQueryProfileCpuNode')[0].blur());
    expect(screen.queryByTestId('esqlQueryProfileCpuTooltip')).not.toBeInTheDocument();
  });

  it('has no CPU breakdown tab when no operator reports a time', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: 'FROM untimed', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByTestId('esqlQueryProfileTimeline')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileBreakdownTab')).not.toBeInTheDocument();
  });

  it('groups the commands of a query by subquery, each with its own time', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: subqueryQuery, include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await userEvent.click(await screen.findByTestId('esqlQueryProfileQueryTab'));

    expect(
      screen.getAllByTestId('esqlQueryProfileCommandGroup').map((row) => row.textContent)
    ).toEqual(['Subquery 1', 'Subquery 2', 'Outer query']);
    const rows = screen.getAllByTestId('esqlQueryProfileCommand');
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent('FROM a');
    expect(rows[0]).toHaveTextContent('80%');
    expect(rows[1]).toHaveTextContent('STATS c = COUNT(*) BY x');
    expect(rows[2]).toHaveTextContent('STATS t = SUM(c) BY y');
    expect(rows[3]).toHaveTextContent('FROM b');
    expect(rows[3]).toHaveTextContent('5.0%');
    expect(rows[4]).toHaveTextContent('STATS t = COUNT(*) BY y');
    expect(rows[5]).toHaveTextContent('SORT t DESC');
    // The first subquery has two aggregations, so they share their time. The second has one.
    expect(rows[1]).toHaveTextContent('~');
    expect(rows[2]).toHaveTextContent('~');
    expect(rows[4]).toHaveTextContent('1.0%');
    expect(rows[4]).not.toHaveTextContent('~');
  });

  it('offers no way to show the heat on the editor for a query that is not the editor query', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: heatQuery, include_execution_metadata: true });

    // The editor holds another query, as when the request is the one behind a visualization.
    const other = renderView(
      <QueryProfileView
        adapters={{ requests }}
        search={search}
        options={{ editorQuery: 'FROM somewhere_else' }}
      />
    );
    await userEvent.click(await screen.findByTestId('esqlQueryProfileQueryTab'));
    expect(screen.queryByTestId('esqlQueryProfileShowOnQuery')).not.toBeInTheDocument();
    expect(screen.getByTestId('esqlQueryProfileOtherQuery')).toBeInTheDocument();
    other.unmount();

    // A host with no editor offers nothing to show it on either, and says nothing about it.
    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await userEvent.click(await screen.findByTestId('esqlQueryProfileQueryTab'));
    expect(screen.queryByTestId('esqlQueryProfileShowOnQuery')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileOtherQuery')).not.toBeInTheDocument();
  });

  it('treats a reformatted editor query as the same query', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: heatQuery, include_execution_metadata: true });

    renderView(
      <QueryProfileView
        adapters={{ requests }}
        search={search}
        options={{ editorQuery: `  ${heatQuery.replace(/\n/g, ' ')}  ` }}
      />
    );
    await userEvent.click(await screen.findByTestId('esqlQueryProfileQueryTab'));

    expect(screen.getByTestId('esqlQueryProfileShowOnQuery')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileOtherQuery')).not.toBeInTheDocument();
  });

  it('shows each command of the query with its share of the CPU time', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: heatQuery, include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    await userEvent.click(await screen.findByTestId('esqlQueryProfileQueryTab'));

    const rows = screen.getAllByTestId('esqlQueryProfileCommand');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('FROM heat');
    expect(rows[0]).toHaveTextContent('60%');
    expect(rows[0]).toHaveTextContent('LuceneSource');
    expect(rows[1]).toHaveTextContent('WHERE a > 1');
    expect(rows[1]).toHaveTextContent('–');
    expect(rows[1]).toHaveTextContent('likely pushed into the search');
    expect(rows[2]).toHaveTextContent('STATS c = COUNT(*) BY a');
    expect(rows[2]).toHaveTextContent('30%');
    expect(rows[3]).toHaveTextContent('SORT c DESC');
    expect(rows[3]).toHaveTextContent('10%');
    // The exchange operator belongs to no command, but it reports no time, so nothing is left over.
    expect(screen.queryByTestId('esqlQueryProfileUnattributed')).not.toBeInTheDocument();
  });

  it('shows the heat on the query editor, and hides it again', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: heatQuery, include_execution_metadata: true });

    renderView(
      <QueryProfileView
        adapters={{ requests }}
        search={search}
        options={{ editorQuery: heatQuery }}
      />
    );
    await userEvent.click(await screen.findByTestId('esqlQueryProfileQueryTab'));
    expect(getQueryProfileHeat()).toBeUndefined();

    await userEvent.click(screen.getByTestId('esqlQueryProfileShowOnQuery'));

    const heat = getQueryProfileHeat();
    expect(heat?.query).toBe(heatQuery);
    expect(heat?.commands.map((command) => heatQuery.slice(command.start, command.end))).toEqual([
      'FROM heat',
      'WHERE a > 1',
      'STATS c = COUNT(*) BY a',
      'SORT c DESC',
    ]);
    expect(screen.getByTestId('esqlQueryProfileShowOnQuery')).toHaveTextContent('Hide on query');

    await userEvent.click(screen.getByTestId('esqlQueryProfileShowOnQuery'));

    expect(getQueryProfileHeat()).toBeUndefined();
    expect(screen.getByTestId('esqlQueryProfileShowOnQuery')).toHaveTextContent('Show on query');
  });

  it('colors the drivers the query waited for and grays the rest, and says why', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM straggler',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    const bars = await screen.findAllByTestId('esqlQueryProfileLaneBar');
    const critical = bars.filter((bar) => bar.getAttribute('data-critical') === 'true');
    const other = bars.filter((bar) => bar.getAttribute('data-critical') === 'false');
    // The final driver and the slow data driver it waited for. The four quick ones did not decide it.
    expect(critical).toHaveLength(2);
    expect(other).toHaveLength(4);

    // The drivers the query waited for come first, in the order they happened, so they are not
    // buried under the lanes of the drivers that did not decide anything.
    const groupLabels = screen.getAllByTestId('esqlQueryProfileTimeline')[0].querySelectorAll('p');
    expect(groupLabels[0]).toHaveTextContent('Critical path');
    // Their lanes say what kind of driver they are, since the kinds are mixed in this group.
    expect(
      screen
        .getAllByTestId('esqlQueryProfileLane')
        .slice(0, 2)
        .map((lane) => lane.textContent)
    ).toEqual([
      expect.stringContaining('data · node-a'),
      expect.stringContaining('final · node-a'),
    ]);
    // The first bar is the planning lane, and the next two are the critical drivers, in order.
    expect(bars.slice(1, 3).map((bar) => bar.getAttribute('data-critical'))).toEqual([
      'true',
      'true',
    ]);
    expect(bars.slice(1, 3).map((bar) => bar.getAttribute('data-driver-label'))).toEqual([
      'data · node-a',
      'final · node-a',
    ]);

    const legend = screen.getByTestId('esqlQueryProfileLaneLegend');
    expect(legend).toHaveTextContent('Critical path: what the query waited for');
    expect(legend).toHaveTextContent('Other work: ran at the same time');
    expect(legend).toHaveTextContent('Waiting, for example for another driver to send data');

    // The wait is long enough to carry its own label.
    expect(screen.getByTestId('esqlQueryProfileLaneWaitLabel')).toHaveTextContent(
      'Waiting for data 30 ms'
    );

    // And the insights say what it means for making the query faster.
    expect(screen.getAllByTestId('esqlQueryProfileInsight')[0]).toHaveTextContent(
      'One data driver finished 17 ms after the typical one, and the query waited for it.'
    );
  });

  it('does not gray any driver when it cannot tell what the query waited for', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: 'FROM timeline', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    const bars = await screen.findAllByTestId('esqlQueryProfileLaneBar');
    expect(bars.every((bar) => bar.getAttribute('data-critical') === null)).toBe(true);
    expect(screen.queryByText(/Critical path/)).not.toBeInTheDocument();
  });

  it('shows a dash, not 0%, for an operator that reports no time', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM waiting',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    await userEvent.click(await screen.findByTestId('esqlQueryProfileOperatorsTab'));
    const sink = screen
      .getAllByTestId('esqlQueryProfileOperator')
      .find((row) => row.textContent?.includes('ExchangeSink'));
    expect(sink).toHaveTextContent('–');
    expect(sink).not.toHaveTextContent('0%');
    const source = screen
      .getAllByTestId('esqlQueryProfileOperator')
      .find((row) => row.textContent?.includes('LuceneSource'));
    expect(source).toHaveTextContent('100%');
  });

  it('lists operators summed across drivers, slowest first, on the Operators tab', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: 'FROM timeline',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    await userEvent.click(await screen.findByTestId('esqlQueryProfileOperatorsTab'));

    expect(screen.queryByTestId('esqlQueryProfileTimeline')).not.toBeInTheDocument();
    const operators = screen.getAllByTestId('esqlQueryProfileOperator');
    expect(operators).toHaveLength(3);
    expect(operators[0]).toHaveTextContent('ValuesSourceReader');
    expect(operators[1]).toHaveTextContent('Eval');
    expect(operators[2]).toHaveTextContent('Limit');

    await userEvent.click(screen.getByTestId('esqlQueryProfileTimelineTab'));
    expect(screen.getByTestId('esqlQueryProfileTimeline')).toBeInTheDocument();
  });
});

describe('QueryProfileView faster query suggestion', () => {
  const slowProfile = {
    query: { took_millis: 1_000 },
    planning: { took_millis: 10 },
    drivers: [
      {
        description: 'data',
        operators: [
          {
            operator: 'ValuesSourceReaderOperator[fields = [body]]',
            status: { process_nanos: 900_000_000, rows_received: 10, rows_emitted: 10 },
          },
        ],
      },
    ],
  };
  const fastProfile = {
    query: { took_millis: 200 },
    planning: { took_millis: 10 },
    drivers: [
      {
        description: 'data',
        operators: [
          {
            operator: 'ValuesSourceReaderOperator[fields = [x]]',
            status: { process_nanos: 100_000_000, rows_received: 10, rows_emitted: 10 },
          },
        ],
      },
    ],
  };
  const columns = [{ name: 'x' }];
  const values = [[1], [2]];

  const ORIGINAL = 'FROM logs | WHERE x > 0';
  const SUGGESTED = 'FROM logs | KEEP x | WHERE x > 0';

  const setup = (
    suggestedResponse: { columns: object[]; values: unknown[][] },
    { available = true, onApplyQuery }: { available?: boolean; onApplyQuery?: () => void } = {}
  ) => {
    const esql = jest.fn(async ({ query }: { query: string }) => ({
      rawResponse:
        query === SUGGESTED
          ? { profile: fastProfile, ...suggestedResponse }
          : { profile: slowProfile, columns, values },
    }));
    const post = jest.fn();
    const get = jest.fn().mockResolvedValue({ available });
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', {
      query: ORIGINAL,
      time_zone: 'UTC',
      include_execution_metadata: true,
    });
    const search = { esql } as unknown as Pick<ISearchStart, 'esql'>;
    renderView(
      <QueryProfileView
        adapters={{ requests }}
        search={search}
        http={{ get, post } as never}
        options={onApplyQuery ? { onApplyQuery, editorQuery: ORIGINAL } : undefined}
      />
    );
    return { esql, post, get };
  };

  beforeEach(() => setProfileBaseline(undefined));

  it('suggests a query without running it, then profiles it on request and compares', async () => {
    const { esql, post } = setup({ columns, values: [[2], [1]] });
    post.mockResolvedValue({ query: SUGGESTED, reason: 'Only x is needed.' });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));

    expect(await screen.findByText(SUGGESTED)).toBeInTheDocument();
    expect(screen.getByTestId('esqlQueryProfileSuggestionReason')).toHaveTextContent(
      'Only x is needed.'
    );
    expect(screen.getByText(/has not been run/)).toBeInTheDocument();
    expect(esql).toHaveBeenCalledTimes(1);

    const [route, { body }] = post.mock.calls[0];
    expect(route).toBe('/internal/esql/optimize_query');
    expect(JSON.parse(body)).toMatchObject({ queryString: ORIGINAL });
    expect(JSON.parse(body).profileContext).toContain('ValuesSourceReader');

    await userEvent.click(screen.getByTestId('esqlQueryProfileProfileSuggestion'));

    expect(await screen.findByTestId('esqlQueryProfileComparison')).toHaveTextContent(
      'Compared with the original query'
    );
    expect(esql).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: SUGGESTED, timeZone: 'UTC', profile: true }),
      expect.anything()
    );
    expect(screen.getByTestId('esqlQueryProfileComparedTotal')).toHaveTextContent('1 s → 200 ms');
    expect(screen.getByTestId('esqlQueryProfileComparedTotal')).toHaveTextContent('−80%');
    expect(screen.getByTestId('esqlQueryProfileResultsCheck')).toHaveTextContent(
      'Same results: 2 rows, in a different order.'
    );
  });

  it('puts the compared query in the editor when the results match', async () => {
    const onApplyQuery = jest.fn();
    const { post } = setup({ columns, values: [[2], [1]] }, { onApplyQuery });
    post.mockResolvedValue({ query: SUGGESTED, reason: 'Only x is needed.' });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));
    // Applying before the comparison is not offered.
    expect(screen.queryByTestId('esqlQueryProfileApplySuggestion')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByTestId('esqlQueryProfileProfileSuggestion'));
    await userEvent.click(await screen.findByTestId('esqlQueryProfileApplySuggestion'));

    expect(onApplyQuery).toHaveBeenCalledWith(SUGGESTED);
  });

  it('does not offer to use a query that returned different results', async () => {
    const { post } = setup({ columns, values: [[1]] }, { onApplyQuery: jest.fn() });
    post.mockResolvedValue({ query: SUGGESTED, reason: 'Faster.' });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));
    await userEvent.click(await screen.findByTestId('esqlQueryProfileProfileSuggestion'));

    expect(await screen.findByTestId('esqlQueryProfileResultsCheck')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileApplySuggestion')).not.toBeInTheDocument();
  });

  it('does not offer a faster query for a request that is not the editor query', async () => {
    const post = jest.fn();
    const get = jest.fn().mockResolvedValue({ available: true });
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: ORIGINAL, include_execution_metadata: true });
    const search = {
      esql: jest.fn(async () => ({ rawResponse: { profile: slowProfile, columns, values } })),
    } as unknown as Pick<ISearchStart, 'esql'>;

    // The editor holds a different query, as when the request is the one behind a visualization.
    renderView(
      <QueryProfileView
        adapters={{ requests }}
        search={search}
        http={{ get, post } as never}
        options={{ onApplyQuery: jest.fn(), editorQuery: 'FROM somewhere_else' }}
      />
    );

    expect(await screen.findByTestId('esqlQueryProfileOtherQuery')).toBeInTheDocument();
    expect(await screen.findByTestId('esqlQueryProfileActions')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileSuggest')).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('still offers a faster query when the host does not say what its editor holds', async () => {
    const { post } = setup({ columns, values });
    post.mockResolvedValue({ query: null, reason: 'Already efficient.' });

    // A host with no editor, such as a dashboard, can still copy the suggestion.
    expect(await screen.findByTestId('esqlQueryProfileSuggest')).toBeInTheDocument();
  });

  it('does not offer to use a query when the opener cannot take one', async () => {
    const { post } = setup({ columns, values: [[2], [1]] });
    post.mockResolvedValue({ query: SUGGESTED, reason: 'Only x is needed.' });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));
    await userEvent.click(await screen.findByTestId('esqlQueryProfileProfileSuggestion'));

    expect(await screen.findByTestId('esqlQueryProfileComparison')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileApplySuggestion')).not.toBeInTheDocument();
  });

  it('hides the action when no AI connector is available', async () => {
    const { get } = setup({ columns, values }, { available: false });

    expect(await screen.findByTestId('esqlQueryProfileActions')).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith('/internal/esql/optimize_query'));
    expect(screen.queryByTestId('esqlQueryProfileSuggest')).not.toBeInTheDocument();
  });

  it('warns when the suggested query does not return the same results', async () => {
    const { post } = setup({ columns, values: [[1]] });
    post.mockResolvedValue({ query: SUGGESTED, reason: 'Faster.' });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));
    await userEvent.click(await screen.findByTestId('esqlQueryProfileProfileSuggestion'));

    expect(await screen.findByTestId('esqlQueryProfileResultsCheck')).toHaveTextContent(
      'It returns 1 row and the original returned 2. This is not an equivalent query.'
    );
  });

  it('says so when the AI finds no safe improvement', async () => {
    const { post, esql } = setup({ columns, values });
    post.mockResolvedValue({ query: null, reason: 'It is already efficient.' });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));

    expect(await screen.findByTestId('esqlQueryProfileNoSuggestion')).toHaveTextContent(
      'No safe improvement found. It is already efficient.'
    );
    expect(esql).toHaveBeenCalledTimes(1);
  });

  it('shows the reason when the suggestion fails, for example without an AI connector', async () => {
    const { post } = setup({ columns, values });
    post.mockRejectedValue({ body: { message: 'No AI connector available.' } });

    await userEvent.click(await screen.findByTestId('esqlQueryProfileSuggest'));

    expect(await screen.findByText('No AI connector available.')).toBeInTheDocument();
    expect(screen.getByText('Unable to suggest a faster query')).toBeInTheDocument();
  });

  it('does not offer the suggestion without an http service', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: ORIGINAL, include_execution_metadata: true });
    const search = {
      esql: jest.fn(async () => ({ rawResponse: { profile: slowProfile } })),
    } as unknown as Pick<ISearchStart, 'esql'>;

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByTestId('esqlQueryProfileActions')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileSuggest')).not.toBeInTheDocument();
  });
});

function laneWidth(label: string): number {
  const bar = document.querySelector(`[data-driver-label="${label}"]`);
  if (!(bar instanceof HTMLElement)) {
    throw new Error(`Missing lane ${label}`);
  }
  return parseFloat(bar.style.width);
}
