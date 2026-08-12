/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SortDirectionToggle } from './sort_selector_helpers';
import { METRICS_SORT_DIRECTION } from '../../common/constants';

const renderToggle = () =>
  render(
    <IntlProvider locale="en">
      <SortDirectionToggle
        direction={METRICS_SORT_DIRECTION.asc}
        isDisabled={false}
        onChange={jest.fn()}
      />
    </IntlProvider>
  );

describe('SortDirectionToggle', () => {
  it('emits stable telemetry attributes for direction options', () => {
    renderToggle();

    const asc = screen.getByTestId('metricsExperienceSortDirectionAsc');
    const desc = screen.getByTestId('metricsExperienceSortDirectionDesc');

    // These are telemetry values - changing them breaks historical analysis.
    expect(asc).toHaveAttribute('data-ebt-action', 'setSortDirection');
    expect(asc).toHaveAttribute('data-ebt-element', 'chartsToolbar');
    expect(asc).toHaveAttribute('data-ebt-detail', 'asc');

    expect(desc).toHaveAttribute('data-ebt-action', 'setSortDirection');
    expect(desc).toHaveAttribute('data-ebt-element', 'chartsToolbar');
    expect(desc).toHaveAttribute('data-ebt-detail', 'desc');
  });
});
