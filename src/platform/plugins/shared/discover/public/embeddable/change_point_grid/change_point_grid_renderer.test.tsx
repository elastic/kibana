/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { ChangePointLensChart } from '@kbn/change-point-chart-viewer';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { ReplaySubject } from 'rxjs';
import { ChangePointGridRenderer } from './change_point_grid_renderer';

jest.mock('@kbn/change-point-chart-viewer', () => ({
  ChangePointLensChart: jest.fn(() => <div data-test-subj="changePointMiniChart" />),
}));
jest.mock('@kbn/esql-utils', () => ({
  getChangePointSeriesColumns: jest.fn(() => ({
    valueColumn: 'count',
    timeColumn: '@timestamp',
  })),
}));

const searchContext = {
  filters: [],
};

const renderGrid = (props: Partial<React.ComponentProps<typeof ChangePointGridRenderer>> = {}) => {
  const onRenderedChange = props.onRenderedChange ?? jest.fn();
  const view = render(
    <EuiProvider>
      <I18nProvider>
        <ChangePointGridRenderer
          esql="FROM logs-* | CHANGE_POINT count ON @timestamp"
          cards={[]}
          services={{} as never}
          fetchParams={{} as never}
          fetch$={new ReplaySubject(1)}
          searchContext={searchContext}
          onRenderedChange={onRenderedChange}
          {...props}
        />
      </I18nProvider>
    </EuiProvider>
  );

  return { ...view, onRenderedChange };
};

describe('ChangePointGridRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders each returned card', () => {
    renderGrid({
      cards: [
        { id: 'ao', title: 'AO' },
        { id: 'bd', title: 'BD' },
      ] as never,
    });

    expect(screen.getAllByTestId('changePointMiniChart')).toHaveLength(2);
    expect(jest.mocked(ChangePointLensChart).mock.calls[0][0].showPanelActions).toBe(false);
  });

  it('shows an empty state when there are no cards', () => {
    const { onRenderedChange, rerender } = renderGrid({ cards: [] });

    expect(screen.getByText('No change point series to chart')).toBeInTheDocument();
    expect(screen.getByText('No change points detected.')).toBeInTheDocument();
    expect(onRenderedChange).toHaveBeenCalledWith(true);

    rerender(
      <EuiProvider>
        <I18nProvider>
          <ChangePointGridRenderer
            esql="FROM logs-* | CHANGE_POINT count ON @timestamp"
            cards={[]}
            services={{} as never}
            fetchParams={{} as never}
            fetch$={new ReplaySubject(1)}
            searchContext={searchContext}
            onRenderedChange={onRenderedChange}
          />
        </I18nProvider>
      </EuiProvider>
    );
    expect(onRenderedChange).toHaveBeenLastCalledWith(true);
  });

  it('waits for every current chart and ignores a callback from the previous card list', () => {
    const onRenderedChange = jest.fn();
    const cards = [
      { id: 'ao', title: 'AO' },
      { id: 'bd', title: 'BD' },
    ] as never;
    const { rerender } = renderGrid({ cards, onRenderedChange });
    const firstChart = jest.mocked(ChangePointLensChart).mock.calls[0][0];
    const secondChart = jest.mocked(ChangePointLensChart).mock.calls[1][0];

    firstChart.onRenderedChange?.(true);
    expect(onRenderedChange).toHaveBeenLastCalledWith(false);
    secondChart.onRenderedChange?.(true);
    expect(onRenderedChange).toHaveBeenLastCalledWith(true);

    const nextCards = [
      { id: 'ao', title: 'AO' },
      { id: 'bd', title: 'BD' },
    ] as never;
    const callsBeforeNextList = onRenderedChange.mock.calls.length;
    rerender(
      <EuiProvider>
        <I18nProvider>
          <ChangePointGridRenderer
            esql="FROM logs-* | CHANGE_POINT count ON @timestamp"
            cards={nextCards}
            services={{} as never}
            fetchParams={{} as never}
            fetch$={new ReplaySubject(1)}
            searchContext={searchContext}
            onRenderedChange={onRenderedChange}
          />
        </I18nProvider>
      </EuiProvider>
    );

    firstChart.onRenderedChange?.(true);
    expect(onRenderedChange).toHaveBeenCalledTimes(callsBeforeNextList);

    const latestCalls = jest.mocked(ChangePointLensChart).mock.calls;
    const nextFirstChart = latestCalls[latestCalls.length - 2][0];
    const nextSecondChart = latestCalls[latestCalls.length - 1][0];
    nextFirstChart.onRenderedChange?.(true);
    expect(onRenderedChange).toHaveBeenLastCalledWith(false);
    nextSecondChart.onRenderedChange?.(true);
    expect(onRenderedChange).toHaveBeenLastCalledWith(true);
  });
});
