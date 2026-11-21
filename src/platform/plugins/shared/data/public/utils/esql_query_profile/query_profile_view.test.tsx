/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';
import type { ISearchStart } from '../../search';
import { getEsqlQueryProfileViewDescription } from '.';
import { QueryProfileView } from './query_profile_view';

const QUERY = 'FROM logs\n| WHERE a > 1\n| STATS c = COUNT(*) BY a\n| SORT c DESC';

const profile = {
  query: { took_millis: 2_000, start_millis: 1_000, stop_millis: 3_000 },
  planning: { took_millis: 500, start_millis: 1_000, stop_millis: 1_500 },
  parsing: { took_millis: 40 },
  drivers: [
    {
      description: 'data',
      node_name: 'node-a',
      start_millis: 1_500,
      stop_millis: 2_200,
      cpu_nanos: 600_000_000,
      operators: [
        {
          operator: 'LuceneSourceOperator',
          status: { process_nanos: 60_000_000, rows_received: 10, rows_emitted: 10 },
        },
        {
          operator: 'HashAggregationOperator',
          status: { hash_nanos: 30_000_000 },
        },
        {
          operator: 'TopNOperator',
          status: { receive_nanos: 10_000_000 },
        },
        { operator: 'ExchangeSinkOperator', status: { rows_received: 5 } },
      ],
    },
    {
      description: 'final',
      node_name: 'node-a',
      start_millis: 1_400,
      stop_millis: 2_800,
      sleeps: {
        counts: { 'exchange empty': 1 },
        first: [
          { reason: 'exchange empty', thread_name: 'T#1', sleep_millis: 1_600, wake_millis: 2_700 },
        ],
      },
      operators: [{ operator: 'ExchangeSourceOperator', status: { rows_emitted: 5 } }],
    },
  ],
};

const untimedProfile = {
  query: { took_millis: 100 },
  planning: { took_millis: 10 },
  drivers: [
    {
      description: 'data',
      operators: [{ operator: 'EvalOperator', status: { process_nanos: 2_000_000 } }],
    },
  ],
};

const renderView = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <I18nProvider>{ui}</I18nProvider>
    </EuiProvider>
  );

const logRequest = (
  adapter: RequestAdapter,
  name: string,
  json: object,
  stats?: RequestStatistics
) => {
  const request = adapter.start(name).json(json);
  if (stats) {
    request.stats(stats);
  }
  request.ok({ json: {} });
};

/** Logs one ES|QL request, as Discover does, and renders the profile view for it. */
const renderProfileOf = (query: string, search: Pick<ISearchStart, 'esql'>) => {
  const requests = new RequestAdapter();
  logRequest(requests, 'Documents', { query, include_execution_metadata: true });
  return renderView(<QueryProfileView adapters={{ requests }} search={search} />);
};

describe('getEsqlQueryProfileViewDescription', () => {
  const view = getEsqlQueryProfileViewDescription(() => ({
    search: {} as ISearchStart,
  }));

  it('shows for an ES|QL request and stays hidden for DSL and SQL', () => {
    const esql = new RequestAdapter();
    logRequest(esql, 'Documents', { query: 'FROM logs', include_execution_metadata: true });
    expect(view.shouldShow?.({ requests: esql })).toBe(true);

    const dsl = new RequestAdapter();
    logRequest(dsl, 'Documents', { query: { match_all: {} }, size: 10 });
    expect(view.shouldShow?.({ requests: dsl })).toBe(false);

    const sql = new RequestAdapter();
    logRequest(sql, 'Documents', { query: 'SELECT * FROM logs', fetchSize: 10 });
    expect(view.shouldShow?.({ requests: sql })).toBe(false);
    expect(view.shouldShow?.({})).toBe(false);
  });
});

describe('QueryProfileView', () => {
  const esql = jest.fn(async ({ query }: { query: string }) => ({
    rawResponse: { profile: query === 'FROM untimed' ? untimedProfile : profile },
  }));
  const search = { esql } as unknown as Pick<ISearchStart, 'esql'>;

  beforeEach(() => esql.mockClear());

  it('re-runs the request with profiling and shows the duration split', async () => {
    const requests = new RequestAdapter();
    logRequest(
      requests,
      'Documents',
      {
        query: QUERY,
        include_execution_metadata: true,
        time_zone: 'UTC',
        filter: { match_all: {} },
        approximation: true,
        project_routing: 'my-project',
      },
      { queryTime: { label: 'Query time', value: '15ms' } }
    );

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);

    expect(await screen.findByTestId('esqlQueryProfileIntro')).toHaveTextContent(
      'The original took 15ms and is unchanged.'
    );
    expect(await screen.findByTestId('esqlQueryProfileDuration')).toHaveTextContent('2 s');
    expect(screen.getByText('Profiled run · 2 drivers')).toBeInTheDocument();
    expect(screen.getByText('Planning 500 ms')).toBeInTheDocument();
    expect(screen.getByText('Execution 1.5 s')).toBeInTheDocument();
    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: QUERY,
        timeZone: 'UTC',
        filter: { match_all: {} },
        profile: true,
        approximation: true,
        projectRouting: 'my-project',
      }),
      expect.objectContaining({ abortSignal: expect.anything() })
    );
  });

  it('breaks the operator time down by kind of work', async () => {
    renderProfileOf(QUERY, search);

    const breakdown = await screen.findByTestId('esqlQueryProfileCpuBreakdown');
    expect(breakdown).toHaveTextContent('Operator time by kind of work');
    expect(breakdown).toHaveTextContent('Read 60%');
    expect(breakdown).toHaveTextContent('Aggregate and sort 40%');
  });

  it('shows the error when the profile cannot be loaded', async () => {
    const failing = {
      esql: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Pick<ISearchStart, 'esql'>;
    renderProfileOf(QUERY, failing);

    expect(await screen.findByText('Unable to profile this query')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('profiles the request chosen in the picker', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: QUERY, include_execution_metadata: true });
    logRequest(requests, 'Chart', { query: 'FROM untimed', include_execution_metadata: true });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await screen.findByTestId('esqlQueryProfileDuration');

    await userEvent.click(screen.getByRole('combobox', { name: 'Request' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Chart' }));

    await waitFor(() =>
      expect(esql).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'FROM untimed' }),
        expect.anything()
      )
    );
  });

  it('numbers requests that share a name, as the Requests view does', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Visualization', { query: QUERY, include_execution_metadata: true });
    logRequest(requests, 'Visualization', {
      query: 'FROM untimed',
      include_execution_metadata: true,
    });

    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await screen.findByTestId('esqlQueryProfileDuration');
    await userEvent.click(screen.getByRole('combobox', { name: 'Request' }));

    expect(await screen.findByRole('option', { name: 'Visualization (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Visualization (2)' })).toBeInTheDocument();
  });

  it('profiles again on request and shows the new profile', async () => {
    renderProfileOf(QUERY, search);
    expect(await screen.findByTestId('esqlQueryProfileDuration')).toHaveTextContent('2 s');

    esql.mockResolvedValueOnce({
      rawResponse: { profile: { ...profile, query: { ...profile.query, took_millis: 4_000 } } },
    });
    await userEvent.click(screen.getByTestId('esqlQueryProfileRunAgain'));

    await waitFor(() =>
      expect(screen.getByTestId('esqlQueryProfileDuration')).toHaveTextContent('4 s')
    );
    expect(esql).toHaveBeenCalledTimes(2);
  });

  it('says there is nothing to profile when the request is gone, instead of waiting for it', async () => {
    const requests = new RequestAdapter();
    logRequest(requests, 'Documents', { query: QUERY, include_execution_metadata: true });
    renderView(<QueryProfileView adapters={{ requests }} search={search} />);
    await screen.findByTestId('esqlQueryProfileDuration');

    act(() => requests.reset());

    expect(await screen.findByTestId('esqlQueryProfileNoRequest')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlQueryProfileLoading')).not.toBeInTheDocument();
  });

  describe('timeline', () => {
    const open = async () => {
      renderProfileOf(QUERY, search);
      return screen.findByTestId('esqlQueryProfileTimeline');
    };

    it('draws a lane for planning and for every driver, with a ruler and the waits', async () => {
      const timeline = await open();

      expect(timeline).toHaveTextContent('Data');
      expect(timeline).toHaveTextContent('Final');
      expect(screen.getByTestId('esqlQueryProfilePlanningLane')).toHaveTextContent('500 ms');
      expect(screen.getAllByTestId('esqlQueryProfileLane')).toHaveLength(2);
      expect(screen.getByTestId('esqlQueryProfileRuler')).toBeInTheDocument();
      expect(screen.getAllByTestId('esqlQueryProfileLaneWait')).toHaveLength(1);
      expect(screen.getByText(/Waiting, for example for another driver/)).toBeInTheDocument();
    });

    it('says how long a driver waited when its lane is pointed at', async () => {
      await open();
      const [, finalLane] = screen.getAllByTestId('esqlQueryProfileLane');

      await userEvent.hover(finalLane);

      expect(await screen.findByText('Waited 1.1 s (exchange empty)')).toBeInTheDocument();
    });

    it('shows the operators of a driver when its lane is selected, and hides them again', async () => {
      await open();
      const [dataLane] = screen.getAllByTestId('esqlQueryProfileLane');

      await userEvent.click(dataLane);

      expect(dataLane).toHaveAttribute('aria-pressed', 'true');
      const strip = await screen.findByTestId('esqlQueryProfileOperatorStrip');
      expect(strip).toHaveTextContent('LuceneSource');
      expect(strip).toHaveTextContent('60%');
      expect(strip).toHaveTextContent('Rows 10 → 10');
      expect(strip).toHaveTextContent('HashAggregation');

      // Each bar is filled to the share of its own operator, so they are not all the same.
      const fills = Array.from(strip.querySelectorAll('progress')).map((bar) =>
        Math.round(bar.value)
      );
      expect(fills).toEqual([60, 30, 10, 0]);

      // EuiProgress also writes its value in a live region, which screen readers must not announce
      // because the button already says it.
      const liveRegions = Array.from(strip.querySelectorAll('[aria-live]'));
      expect(liveRegions.length).toBeGreaterThan(0);
      liveRegions.forEach((region) =>
        expect(region.closest('[aria-hidden="true"]')).not.toBeNull()
      );

      await userEvent.click(dataLane);

      expect(screen.queryByTestId('esqlQueryProfileOperatorStrip')).not.toBeInTheDocument();
    });

    it('shows the raw status of an operator, and a dash for one that reports no time', async () => {
      await open();
      await userEvent.click(screen.getAllByTestId('esqlQueryProfileLane')[0]);

      const operators = await screen.findAllByTestId('esqlQueryProfileOperator');
      const exchange = operators.find((operator) => operator.textContent?.includes('ExchangeSink'));
      expect(exchange).toHaveTextContent('–');

      const source = operators.find((operator) => operator.textContent?.includes('LuceneSource'));
      await userEvent.click(source as HTMLElement);

      const details = await screen.findByTestId('esqlQueryProfileOperatorDetails');
      const rawStatus = details.querySelector('code') as HTMLElement;
      // The raw status is behind its own section, which starts collapsed.
      expect(rawStatus).not.toBeVisible();

      await userEvent.click(within(details).getByRole('button', { name: 'Raw status' }));

      expect(rawStatus).toBeVisible();
      expect(rawStatus).toHaveTextContent('"process_nanos": 60000000');
    });

    it('lists the planning phases when the planning lane is selected', async () => {
      await open();

      await userEvent.click(screen.getByTestId('esqlQueryProfilePlanningLane'));

      expect(await screen.findByTestId('esqlQueryProfilePlanningPhases')).toHaveTextContent(
        'Parsing 40 ms'
      );
    });

    it('says so when the profile has no timing for drivers', async () => {
      renderProfileOf('FROM untimed', search);

      expect(
        await screen.findByText('This profile did not include timing for individual drivers.')
      ).toBeInTheDocument();
    });
  });
});
