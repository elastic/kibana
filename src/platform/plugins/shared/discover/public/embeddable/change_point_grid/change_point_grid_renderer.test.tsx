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

const renderGrid = (props: Partial<React.ComponentProps<typeof ChangePointGridRenderer>>) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ChangePointGridRenderer
          esql="FROM logs-* | CHANGE_POINT count ON @timestamp"
          cards={[]}
          services={{} as never}
          fetchParams={{} as never}
          fetch$={new ReplaySubject(1)}
          searchContext={searchContext}
          {...props}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('ChangePointGridRenderer', () => {
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
    renderGrid({ cards: [] });

    expect(screen.getByText('No change point series to chart')).toBeInTheDocument();
    expect(screen.getByText('No change points detected.')).toBeInTheDocument();
  });
});
