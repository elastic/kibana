/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import { LatencyAggregationType } from '@kbn/apm-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ServiceFlyoutTransactionsSection } from '.';

const START = '2024-01-01T00:00:00.000Z';
const END = '2024-01-01T01:00:00.000Z';

const FIXTURE_RESPONSE = {
  maxCountExceeded: false,
  transactionGroups: [
    {
      name: 'GET /api/orders',
      transactionType: 'request',
      latency: 1200000,
      throughput: 42.3,
      errorRate: 0.02,
      alertsCount: 3,
    },
    {
      name: 'POST /api/checkout',
      transactionType: 'request',
      latency: 340000,
      throughput: 18.1,
      errorRate: 0.05,
      alertsCount: 0,
    },
  ],
  hasActiveAlerts: true,
};

const http = {
  get: jest.fn().mockResolvedValue(FIXTURE_RESPONSE),
} as unknown as HttpStart;

const locators = {
  get: (id: string) => ({
    getRedirectUrl: (params: Record<string, unknown>) =>
      `#mock-${id}?${Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`,
  }),
} as unknown as SharePluginStart['url']['locators'];

const BASE_PROPS = {
  http,
  serviceName: 'frontend-node',
  environment: 'production',
  start: START,
  end: END,
  transactionType: 'request',
  latencyAggregationType: LatencyAggregationType.p95,
  locators,
};

describe('ServiceFlyoutTransactionsSection', () => {
  beforeEach(() => {
    (http.get as jest.Mock).mockResolvedValue(FIXTURE_RESPONSE);
  });

  it('renders transaction names as links when locators are provided', async () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    await waitFor(() => screen.getByText('GET /api/orders'));

    const link = screen.getByRole('link', { name: 'GET /api/orders' });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('TransactionDetailsByNameLocator');
    expect(link.getAttribute('href')).toContain('frontend-node');
  });

  it('renders the Open in APM header link when locators are provided', async () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    await waitFor(() => screen.getByText('GET /api/orders'));

    expect(screen.getByRole('link', { name: 'Open in APM' })).toBeInTheDocument();
  });

  it('renders transaction names as plain text when locators are not provided', async () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} locators={undefined} />);

    await waitFor(() => screen.getByText('GET /api/orders'));

    expect(screen.queryByRole('link', { name: 'GET /api/orders' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open in APM' })).not.toBeInTheDocument();
  });

  it('renders the alerts column when hasActiveAlerts is true', async () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    await waitFor(() => screen.getByText('GET /api/orders'));

    expect(screen.getByRole('columnheader', { name: /active alerts/i })).toBeInTheDocument();
  });

  it('omits the alerts column when hasActiveAlerts is false', async () => {
    (http.get as jest.Mock).mockResolvedValue({ ...FIXTURE_RESPONSE, hasActiveAlerts: false });

    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    await waitFor(() => screen.getByText('GET /api/orders'));

    expect(screen.queryByRole('columnheader', { name: /active alerts/i })).not.toBeInTheDocument();
  });

  it('renders the alerts badge as a link pointing to the service alerts locator', async () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    await waitFor(() => screen.getByText('GET /api/orders'));

    const badge = screen.getByRole('link', { name: '3' });
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('href')).toContain('serviceAlertsLocator');
    expect(badge.getAttribute('href')).toContain('frontend-node');
  });
});
