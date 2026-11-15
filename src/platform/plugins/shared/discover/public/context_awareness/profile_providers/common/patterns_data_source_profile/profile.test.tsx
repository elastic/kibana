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
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "GNU Affero General Public License v3.0 only", or the
 * "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createPatternsDataSourceProfileProvider } from './profile';

jest.mock('../sparkline_data_source_profile/sparkline_cell_renderer', () => ({
  SparklineCellRenderer: ({ isSelected }: { isSelected?: boolean }) => (
    <div data-test-subj="patternSparkline" data-selected={String(Boolean(isSelected))} />
  ),
}));

const services = { charts: {} } as ProfileProviderServices;

const cellProps = (pattern: string): DataGridCellValueElementProps =>
  ({
    row: { flattened: { Pattern: pattern } },
    columnId: 'Sparkline',
  } as unknown as DataGridCellValueElementProps);

describe('patterns profile cell renderers', () => {
  it('marks only the compared pattern sparkline as selected', () => {
    const provider = createPatternsDataSourceProfileProvider(services);
    const getCellRenderers = provider.profile.getCellRenderers;
    if (!getCellRenderers) {
      throw new Error('Pattern cell renderers are not registered');
    }
    const renderers = getCellRenderers(() => ({}), {
      context: { patternColumns: ['Pattern'], sparklineColumns: ['Sparkline'] },
    } as Parameters<typeof getCellRenderers>[1])({
      histogramComparisonSelection: { column: 'Pattern', value: 'failed login' },
    } as Parameters<ReturnType<typeof getCellRenderers>>[0]);

    const sparkline = renderers.Sparkline as (
      props: DataGridCellValueElementProps
    ) => React.ReactElement;
    const selected = render(sparkline(cellProps('failed login')));
    expect(selected.getByTestId('patternSparkline')).toHaveAttribute('data-selected', 'true');

    selected.rerender(sparkline(cellProps('other')));
    expect(selected.getByTestId('patternSparkline')).toHaveAttribute('data-selected', 'false');
  });
});
