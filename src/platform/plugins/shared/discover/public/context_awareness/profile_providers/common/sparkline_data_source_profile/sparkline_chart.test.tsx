/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { SparklineChart } from './sparkline_chart';

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarSeries: ({ color }: { color: string }) => (
    <div data-test-subj="sparklineBars" data-color={color} />
  ),
  Settings: () => null,
  Tooltip: () => null,
  ScaleType: { Time: 'time', Linear: 'linear' },
  TooltipType: { None: 'none' },
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      colors: {
        vis: {
          euiColorVisGrey1: '#grey',
          euiColorVis8: '#gold',
        },
      },
    },
  }),
  EuiScreenReaderOnly: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const charts = {
  theme: { useChartsBaseTheme: () => ({}) },
} as ChartsPluginStart;

describe('SparklineChart', () => {
  it('uses gray bars by default and gold bars for the compared pattern', () => {
    const { rerender } = render(<SparklineChart charts={charts} values={[1, 2]} />);

    expect(document.querySelector('[data-test-subj="sparklineBars"]')).toHaveAttribute(
      'data-color',
      '#grey'
    );

    rerender(<SparklineChart charts={charts} values={[1, 2]} isSelected />);

    expect(document.querySelector('[data-test-subj="sparklineBars"]')).toHaveAttribute(
      'data-color',
      '#gold'
    );
  });
});
