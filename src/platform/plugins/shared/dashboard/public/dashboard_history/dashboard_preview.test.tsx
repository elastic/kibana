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

import { DashboardPreview } from './dashboard_preview';

/**
 * The renderer is replaced with a stand-in that behaves like the real one with respect to `setState`:
 * it renders whatever panels it was last given, and keeps the previous time range when a new state has none.
 */
const mockSetStateControl = {
  manual: false,
  /** `setState` calls that have started but not yet been settled; only populated in manual mode */
  calls: [] as Array<{ resolve: () => void; reject: (error: Error) => void }>,
};

jest.mock('..', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useEffect, useRef, useState } = require('react');
  return {
    DASHBOARD_APP_ID: 'dashboards',
    DashboardRenderer: ({
      getCreationOptions,
      onApiAvailable,
    }: {
      getCreationOptions: () => Promise<{ getInitialInput: () => Record<string, unknown> }>;
      onApiAvailable: (api: unknown) => void;
    }) => {
      const [state, setState] = useState(undefined as Record<string, any> | undefined);
      const mountCount = useRef(0);
      useEffect(() => {
        mountCount.current += 1;
        let cancelled = false;
        getCreationOptions().then(({ getInitialInput }) => {
          if (cancelled) return;
          setState(getInitialInput());
          onApiAvailable({
            setState: async (next: Record<string, any>) => {
              if (mockSetStateControl.manual) {
                await new Promise<void>((resolve, reject) => {
                  mockSetStateControl.calls.push({ resolve, reject });
                });
              }
              setState((prev: Record<string, any>) => ({
                ...next,
                viewMode: prev?.viewMode,
                time_range: next.time_range ?? prev?.time_range,
              }));
            },
          });
        });
        return () => {
          cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      if (!state) return null;
      return (
        <div data-test-subj="dashboardRenderer" data-mount-count={mountCount.current}>
          <div data-test-subj="viewMode">{state.viewMode}</div>
          <div data-test-subj="renderedTimeRange">{JSON.stringify(state.time_range ?? null)}</div>
          {(state.panels ?? []).map((panel: { uid: string }) => (
            <div key={panel.uid} data-test-subj="renderedPanel">
              {panel.uid}
            </div>
          ))}
        </div>
      );
    },
  };
});

jest.mock('../services/kibana_services', () => ({
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
    actor: { name: 'Hannah' },
    action: 'dashboard_update',
    snapshot: { title: `Title ${id}`, panels: [], ...snapshot },
  } as unknown as ChangeHistoryDetail);

const panel = (uid: string) => ({
  uid,
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

const bareSnapshot = getChange('bare', {
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
  beforeEach(() => {
    mockSetStateControl.manual = false;
    mockSetStateControl.calls = [];
  });

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
    renderPreview(bareSnapshot);
    await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

    expect(screen.queryByTestId('searchBar')).not.toBeInTheDocument();
  });

  it('falls back to the inherited time range when the snapshot has none', async () => {
    renderPreview(bareSnapshot);
    await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

    expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
      JSON.stringify(inheritedTimeRange)
    );
  });

  describe('switching between snapshots', () => {
    it('swaps panels, filters, query, and title without remounting the dashboard', async () => {
      const { rerender, setPreviewTitle } = renderPreview(fullSnapshot);
      await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));

      rerender(<Wrapper change={bareSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));
      expect(setPreviewTitle).toHaveBeenLastCalledWith('Title bare');
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

      rerender(<Wrapper change={bareSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() =>
        expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
          JSON.stringify(inheritedTimeRange)
        )
      );
    });

    it('uses the saved time range when moving from none to a saved range', async () => {
      const { rerender, setPreviewTitle } = renderPreview(bareSnapshot);
      await waitFor(() => expect(renderedPanels()).toEqual(['panel-c']));

      rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);

      await waitFor(() =>
        expect(screen.getByTestId('renderedTimeRange')).toHaveTextContent(
          JSON.stringify({ from: 'now-1h', to: 'now' })
        )
      );
      expect(searchBar().dataset.from).toBe('now-1h');
    });

    describe('while a previous snapshot is still being applied', () => {
      beforeEach(() => {
        mockSetStateControl.manual = true;
      });

      it('waits for the in-flight application before applying the next snapshot', async () => {
        const { rerender, setPreviewTitle } = renderPreview(bareSnapshot);
        await waitFor(() => expect(mockSetStateControl.calls).toHaveLength(1));

        rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);
        await waitFor(() => expect(setPreviewTitle).toHaveBeenLastCalledWith('Title full'));
        expect(mockSetStateControl.calls).toHaveLength(1);

        mockSetStateControl.calls[0].resolve();
        await waitFor(() => expect(mockSetStateControl.calls).toHaveLength(2));
        mockSetStateControl.calls[1].resolve();

        await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));
      });

      it('still applies the next snapshot after an application fails', async () => {
        const { rerender, setPreviewTitle } = renderPreview(bareSnapshot);
        await waitFor(() => expect(mockSetStateControl.calls).toHaveLength(1));
        rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);

        mockSetStateControl.calls[0].reject(new Error('failed to apply'));
        await waitFor(() => expect(mockSetStateControl.calls).toHaveLength(2));
        mockSetStateControl.calls[1].resolve();

        await waitFor(() => expect(renderedPanels()).toEqual(['panel-a', 'panel-b']));
      });

      it('shows an error for the selection whose application failed', async () => {
        renderPreview(bareSnapshot);
        await waitFor(() => expect(mockSetStateControl.calls).toHaveLength(1));
        expect(screen.queryByTestId('dashboardPreviewApplyError')).not.toBeInTheDocument();

        mockSetStateControl.calls[0].reject(new Error('failed to apply'));

        expect(await screen.findByTestId('dashboardPreviewApplyError')).toBeInTheDocument();
        expect(screen.queryByTestId('searchBar')).not.toBeInTheDocument();
      });

      it('clears the error when a later selection applies successfully', async () => {
        const { rerender, setPreviewTitle } = renderPreview(bareSnapshot);
        await waitFor(() => expect(mockSetStateControl.calls).toHaveLength(1));
        mockSetStateControl.calls[0].reject(new Error('failed to apply'));
        await screen.findByTestId('dashboardPreviewApplyError');

        rerender(<Wrapper change={fullSnapshot} setPreviewTitle={setPreviewTitle} />);
        /** the error state unmounts the renderer, so recovering remounts it and applies the snapshot on the new API */
        await waitFor(() => {
          mockSetStateControl.calls.slice(1).forEach(({ resolve }) => resolve());
          expect(renderedPanels()).toEqual(['panel-a', 'panel-b']);
        });
        expect(screen.queryByTestId('dashboardPreviewApplyError')).not.toBeInTheDocument();
      });
    });
  });
});
