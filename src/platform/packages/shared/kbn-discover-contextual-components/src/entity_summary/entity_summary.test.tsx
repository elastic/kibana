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
import userEvent from '@testing-library/user-event';
import { EntitySummary, type EntitySummaryProps } from './entity_summary';

// `series: null` keeps the metrics in their no-data state so the test exercises labels and values
// without mounting @elastic/charts.
const baseProps: EntitySummaryProps = {
  title: 'checkoutService',
  subtitle: 'production · go',
  titleHref: 'https://localhost/app/apm/services/checkoutService',
  metrics: [
    { label: 'Latency (avg)', valueLabel: '1,000 ms', color: '#111', series: null },
    { label: 'Throughput (avg)', valueLabel: '46 tpm', color: '#222', series: null },
  ],
  links: [
    {
      id: 'alerts',
      label: 'Active alerts',
      iconType: 'bell',
      external: true,
      badgeLabel: 2,
      href: 'https://localhost/app/apm/services/checkoutService/alerts',
    },
    {
      id: 'slos',
      label: 'SLOs',
      iconType: 'chartGauge',
      external: true,
      href: 'https://localhost/app/slos',
    },
  ],
};

describe('EntitySummary', () => {
  it('renders the title as an external link, the subtitle, and the metrics', () => {
    render(<EntitySummary {...baseProps} />);

    const title = screen.getByRole('link', { name: 'checkoutService' });
    expect(title).toBeVisible();
    expect(title).toHaveAttribute('href', baseProps.titleHref);
    expect(title).toHaveAttribute('target', '_blank');

    expect(screen.getByText('production · go')).toBeVisible();

    expect(screen.getByText('Latency (avg)')).toBeVisible();
    expect(screen.getByText('1,000 ms')).toBeVisible();
    expect(screen.getByText('Throughput (avg)')).toBeVisible();
    expect(screen.getByText('46 tpm')).toBeVisible();
  });

  it('renders each link with its count badge', () => {
    render(<EntitySummary {...baseProps} />);

    const alertsLink = screen.getByRole('link', { name: /Active alerts/ });
    expect(alertsLink).toBeVisible();
    expect(alertsLink).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: /SLOs/ })).toBeVisible();
  });

  it('renders the title as plain text when no href is provided', () => {
    render(<EntitySummary {...baseProps} titleHref={undefined} />);

    expect(screen.queryByRole('link', { name: 'checkoutService' })).not.toBeInTheDocument();
    expect(screen.getByText('checkoutService')).toBeVisible();
  });

  it('invokes the filter, copy, and close handlers', async () => {
    const onFilterFor = jest.fn();
    const onFilterOut = jest.fn();
    const onCopyValue = jest.fn();
    const onClose = jest.fn();

    render(
      <EntitySummary
        {...baseProps}
        onFilterFor={onFilterFor}
        onFilterOut={onFilterOut}
        onCopyValue={onCopyValue}
        onClose={onClose}
      />
    );

    await userEvent.click(screen.getByTestId('entitySummaryFilterFor'));
    await userEvent.click(screen.getByTestId('entitySummaryFilterOut'));
    await userEvent.click(screen.getByTestId('entitySummaryCopyValue'));
    await userEvent.click(screen.getByTestId('entitySummaryCloseButton'));

    expect(onFilterFor).toHaveBeenCalledTimes(1);
    expect(onFilterOut).toHaveBeenCalledTimes(1);
    expect(onCopyValue).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the filter actions row when no action handlers are provided', () => {
    render(<EntitySummary {...baseProps} />);

    expect(screen.queryByTestId('entitySummaryFilterFor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entitySummaryCopyValue')).not.toBeInTheDocument();
  });
});
