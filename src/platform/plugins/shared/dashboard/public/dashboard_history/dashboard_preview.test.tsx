/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ChangeHistoryDetail } from '@kbn/change-history-ui';

import * as dashboardApiModule from '../dashboard_api/get_dashboard_api';
import { DashboardPreview } from './dashboard_preview';

/** the renderer is replaced with a stand-in that builds the real dashboard API */
jest.mock('..', () => jest.requireActual('./mock_dashboard_renderer'));

jest.mock('../services/kibana_services', () => ({
  ...jest.requireActual('../services/kibana_services'),
  unifiedSearchService: {
    ui: {
      SearchBar: (props: Record<string, unknown>) => (
        <div
          data-test-subj="searchBar"
          data-filters={JSON.stringify(props.filters ?? null)}
          data-query={JSON.stringify(props.query ?? null)}
          data-from={String(props.dateRangeFrom)}
          data-to={String(props.dateRangeTo)}
          data-show-filter-bar={String(props.showFilterBar)}
          data-show-query-input={String(props.showQueryInput)}
          data-show-date-picker={String(props.showDatePicker)}
        />
      ),
    },
  },
}));

const inheritedTimeRange = { from: 'now-7d', to: 'now' };

const getChange = (id: string, snapshot: Partial<DashboardState>): ChangeHistoryDetail =>
  ({
    id,
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: { name: 'Miles M.' },
    action: 'dashboard_update',
    snapshot: { title: `Title ${id}`, panels: [], ...snapshot },
  } as unknown as ChangeHistoryDetail);

const panel = (id: string) => ({
  id,
  type: 'markdown',
  grid: { x: 0, y: 0, w: 12, h: 8 },
  config: {},
});

const fullSnapshot = getChange('full', {
  panels: [panel('panel-a'), panel('panel-b')] as DashboardState['panels'],
  filters: [
    { type: 'condition', condition: { field: 'host.name', operator: 'is', value: 'web-1' } },
  ] as DashboardState['filters'],
  query: { expression: 'status:error', language: 'kql' },
  time_range: { from: 'now-1h', to: 'now' },
});

const minimalSnapshot = getChange('minimal', {
  panels: [panel('panel-c')] as DashboardState['panels'],
  filters: [],
  query: { expression: '', language: 'kql' },
});

const Wrapper = ({
  change,
  setPreviewTitle,
}: {
  change: ChangeHistoryDetail;
  setPreviewTitle: (title: string) => void;
}) => (
  <DashboardPreview
    change={change}
    objectId="dash-1"
    setPreviewTitle={setPreviewTitle}
    inheritedTimeRange={inheritedTimeRange}
  />
);

const renderPreview = (change: ChangeHistoryDetail, setPreviewTitle = jest.fn()) => ({
  ...render(<Wrapper change={change} setPreviewTitle={setPreviewTitle} />),
  setPreviewTitle,
});

const renderedPanels = () => screen.queryAllByTestId('renderedPanel').map((el) => el.textContent);
const searchBar = () => screen.getByTestId('searchBar');

describe('DashboardPreview', () => {
  it('renders the snapshot panels in a non-interactive dashboard and reports the title', async () => {
    const { setPreviewTitle } = renderPreview(fullSnapshot);

    await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));
    expect(screen.getByTestId('viewMode')).toHaveTextContent('non-interactive');
    expect(setPreviewTitle).toHaveBeenCalledWith('Title full');
  });

  it('shows the snapshot filters, query, and saved time range in the search bar', async () => {
    renderPreview(fullSnapshot);
    await waitFor(() => expect(renderedPanels()).toHaveLength(2));

    const bar = searchBar();
    expect(JSON.parse(bar.dataset.filters!)).toEqual([
      expect.objectContaining({ meta: expect.objectContaining({ key: 'host.name' }) }),
    ]);
    expect(JSON.parse(bar.dataset.query!)).toEqual({ query: 'status:error', language: 'kuery' });
    expect(bar.dataset.from).toBe('now-1h');
    expect(bar.dataset.to).toBe('now');
    expect(bar.dataset.showFilterBar).toBe('true');
    expect(bar.dataset.showQueryInput).toBe('true');
    expect(bar.dataset.showDatePicker).toBe('true');
    expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
      JSON.stringify({ from: 'now-1h', to: 'now' })
    );
  });

  it('hides the search bar when the snapshot has no filters, query, or saved time range', async () => {
    renderPreview(minimalSnapshot);
    await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

    expect(screen.queryByTestId('searchBar')).not.toBeInTheDocument();
  });

  it('falls back to the inherited time range when the snapshot has none', async () => {
    renderPreview(minimalSnapshot);
    await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

    expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
      JSON.stringify(inheritedTimeRange)
    );
  });

  describe('switching between snapshots', () => {
    it('swaps panels, filters, query, and title without remounting the dashboard', async () => {
      const { rerender, setPreviewTitle } = renderPreview(fullSnapshot);
      await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));

      rerender(<Wrapper change={minimalSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));
      expect(setPreviewTitle).toHaveBeenLastCalledWith('Title minimal');
      expect(screen.queryByTestId('searchBar')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboardRenderer')).toHaveAttribute('data-mount-count', '1');

      rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));
      expect(setPreviewTitle).toHaveBeenLastCalledWith('Title full');
      expect(JSON.parse(searchBar().dataset.query!)).toEqual({
        query: 'status:error',
        language: 'kuery',
      });
      expect(screen.getByTestId('dashboardRenderer')).toHaveAttribute('data-mount-count', '1');
    });

    it('re-applies the inherited time range when moving from a saved range to none', async () => {
      const { rerender, setPreviewTitle } = renderPreview(fullSnapshot);
      await waitFor(() =>
        expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
          JSON.stringify({ from: 'now-1h', to: 'now' })
        )
      );

      rerender(<Wrapper change={minimalSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() =>
        expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
          JSON.stringify(inheritedTimeRange)
        )
      );
    });

    it('uses the saved time range when moving from none to a saved range', async () => {
      const { rerender, setPreviewTitle } = renderPreview(minimalSnapshot);
      await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

      rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() =>
        expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
          JSON.stringify({ from: 'now-1h', to: 'now' })
        )
      );
      expect(searchBar().dataset.from).toBe('now-1h');
    });

    it('applies each snapshot in order when selections change in quick succession', async () => {
      const { rerender, setPreviewTitle } = renderPreview(minimalSnapshot);
      await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

      rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);
      rerender(<Wrapper change={minimalSnapshot} setPreviewTitle={setPreviewTitle} />);
      rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));
      expect(screen.getByTestId('dashboardRenderer')).toHaveAttribute('data-mount-count', '1');
    });

    describe('when a snapshot fails to apply', () => {
      /** makes the first `setState` on the next mounted dashboard API reject */
      const failNextApplication = () => {
        const { getDashboardApi } = dashboardApiModule;
        jest.spyOn(dashboardApiModule, 'getDashboardApi').mockImplementationOnce((...args) => {
          const dashboard = getDashboardApi(...args);
          jest.spyOn(dashboard.api, 'setState').mockRejectedValueOnce(new Error('failed to apply'));
          return dashboard;
        });
      };

      beforeEach(() => {
        failNextApplication();
      });

      it('shows an error for the selection whose application failed', async () => {
        renderPreview(minimalSnapshot);

        expect(await screen.findByTestId('dashboardPreviewApplyError')).toBeInTheDocument();
        expect(screen.queryByTestId('searchBar')).not.toBeInTheDocument();
      });

      it('clears the error when a later selection applies successfully', async () => {
        const { rerender, setPreviewTitle } = renderPreview(minimalSnapshot);
        await screen.findByTestId('dashboardPreviewApplyError');

        rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);

        /** the error state unmounts the renderer, so recovering remounts it and applies the snapshot on the new API */
        await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));
        expect(screen.queryByTestId('dashboardPreviewApplyError')).not.toBeInTheDocument();
      });
    });
  });
});
