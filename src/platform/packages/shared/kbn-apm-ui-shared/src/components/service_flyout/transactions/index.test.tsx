/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core/public';
import { LatencyAggregationType } from '@kbn/apm-types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ServiceFlyoutTransactionsSection } from '.';
import { useServiceFlyoutTransactionData } from './hooks/use_service_flyout_transaction_data';
import * as TransactionsTableModule from '../../transactions_table';

jest.mock('./hooks/use_service_flyout_transaction_data');

const FIXTURE_ITEMS = [
  {
    name: 'GET /api/orders',
    transactionType: 'request',
    latency: { value: 1200000 },
    throughput: { value: 42.3 },
    errorRate: { value: 0.02 },
    alertsCount: 3,
  },
  {
    name: 'POST /api/checkout',
    transactionType: 'request',
    latency: { value: 340000 },
    throughput: { value: 18.1 },
    errorRate: { value: 0.05 },
    alertsCount: 0,
  },
];

const DEFAULT_HOOK_RESULT = {
  items: FIXTURE_ITEMS,
  isLoading: false,
  isSparklineLoading: false,
  maxCountExceeded: false,
  hasActiveAlerts: true,
  error: undefined,
  mainError: undefined,
};

const START = '2024-01-01T00:00:00.000Z';
const END = '2024-01-01T01:00:00.000Z';

const locators = {
  get: (id: string) => ({
    getRedirectUrl: (params: Record<string, unknown>) =>
      `#mock-${id}?${Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`,
  }),
} as unknown as SharePluginStart['url']['locators'];

const TROUBLESHOOTING_DOCS_HREF = 'https://docs.example/apm/common-problems#too-many-transactions';

const docLinks = {
  links: { apm: { troubleshootingTooManyTransactions: TROUBLESHOOTING_DOCS_HREF } },
} as unknown as DocLinksStart;

const BASE_PROPS = {
  docLinks,
  http: {} as unknown as HttpStart,
  notifications: { toasts: { addDanger: jest.fn() } } as any,
  serviceName: 'frontend-node',
  environment: 'production',
  start: START,
  end: END,
  transactionType: 'request',
  latencyAggregationType: LatencyAggregationType.p95,
  locators,
};

const mockedUseServiceFlyoutTransactionData = useServiceFlyoutTransactionData as jest.Mock;

describe('ServiceFlyoutTransactionsSection', () => {
  beforeEach(() => {
    mockedUseServiceFlyoutTransactionData.mockReturnValue(DEFAULT_HOOK_RESULT);
  });

  it('renders transaction names as links when locators are provided', () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    const link = screen.getByRole('link', { name: 'GET /api/orders' });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('TransactionDetailsByNameLocator');
    expect(link.getAttribute('href')).toContain('frontend-node');
    expect(link.getAttribute('href')).toContain('production');
  });

  it('calls onTransactionClick instead of navigating when provided', () => {
    const onTransactionClick = jest.fn();
    render(
      <ServiceFlyoutTransactionsSection {...BASE_PROPS} onTransactionClick={onTransactionClick} />
    );

    const link = screen.getByRole('button', { name: 'GET /api/orders' });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBeNull();

    link.click();
    expect(onTransactionClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'GET /api/orders' })
    );
  });

  it('notifies onTransactionsChange when items settle', () => {
    const onTransactionsChange = jest.fn();
    render(
      <ServiceFlyoutTransactionsSection
        {...BASE_PROPS}
        onTransactionsChange={onTransactionsChange}
      />
    );

    expect(onTransactionsChange).toHaveBeenCalledWith(FIXTURE_ITEMS, {
      isLoading: false,
      error: undefined,
      filters: {
        environment: 'production',
        start: START,
        end: END,
        transactionType: 'request',
      },
      isSearchFiltered: false,
    });
  });

  it('notifies onTransactionsChange while loading', () => {
    mockedUseServiceFlyoutTransactionData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      isLoading: true,
      items: [],
    });
    const onTransactionsChange = jest.fn();
    render(
      <ServiceFlyoutTransactionsSection
        {...BASE_PROPS}
        onTransactionsChange={onTransactionsChange}
      />
    );

    expect(onTransactionsChange).toHaveBeenCalledWith([], {
      isLoading: true,
      error: undefined,
      filters: {
        environment: 'production',
        start: START,
        end: END,
        transactionType: 'request',
      },
      isSearchFiltered: false,
    });
  });

  it('reports the main-statistics error so the host does not treat retained items as settled', () => {
    const mainError = new Error('main stats failed');
    mockedUseServiceFlyoutTransactionData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      mainError,
    });
    const onTransactionsChange = jest.fn();
    render(
      <ServiceFlyoutTransactionsSection
        {...BASE_PROPS}
        onTransactionsChange={onTransactionsChange}
      />
    );

    expect(onTransactionsChange).toHaveBeenCalledWith(FIXTURE_ITEMS, {
      isLoading: false,
      error: mainError,
      filters: {
        environment: 'production',
        start: START,
        end: END,
        transactionType: 'request',
      },
      isSearchFiltered: false,
    });
  });

  it('reconciles against the unsearched list when search is client-side', () => {
    mockedUseServiceFlyoutTransactionData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      items: [FIXTURE_ITEMS[0]],
      presenceItems: FIXTURE_ITEMS,
      isServerSearch: false,
    });
    const onTransactionsChange = jest.fn();
    render(
      <ServiceFlyoutTransactionsSection
        {...BASE_PROPS}
        onTransactionsChange={onTransactionsChange}
      />
    );

    expect(onTransactionsChange).toHaveBeenCalledWith(
      FIXTURE_ITEMS,
      expect.objectContaining({ isSearchFiltered: false })
    );
  });

  it('marks a server-side search result as unable to prove absence', () => {
    mockedUseServiceFlyoutTransactionData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      items: [FIXTURE_ITEMS[0]],
      presenceItems: [FIXTURE_ITEMS[0]],
      isServerSearch: true,
    });
    const onTransactionsChange = jest.fn();
    render(
      <ServiceFlyoutTransactionsSection
        {...BASE_PROPS}
        onTransactionsChange={onTransactionsChange}
      />
    );

    expect(onTransactionsChange).toHaveBeenCalledWith([FIXTURE_ITEMS[0]], {
      isLoading: false,
      error: undefined,
      filters: {
        environment: 'production',
        start: START,
        end: END,
        transactionType: 'request',
      },
      isSearchFiltered: true,
    });
  });

  it('renders the Open in APM header link when locators are provided', () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    expect(screen.getByRole('link', { name: 'Open in APM' })).toBeInTheDocument();
  });

  it('forwards projectRouting to the data hook', () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} projectRouting="_alias:*" />);

    expect(mockedUseServiceFlyoutTransactionData).toHaveBeenCalledWith(
      expect.objectContaining({ projectRouting: '_alias:*' })
    );
  });

  it('renders transaction names as plain text when locators are not provided', () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} locators={undefined} />);

    expect(screen.queryByRole('link', { name: 'GET /api/orders' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open in APM' })).not.toBeInTheDocument();
  });

  it('renders the alerts column when hasActiveAlerts is true', () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    expect(screen.getByRole('columnheader', { name: /active alerts/i })).toBeInTheDocument();
  });

  it('omits the alerts column when hasActiveAlerts is false', () => {
    mockedUseServiceFlyoutTransactionData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      hasActiveAlerts: false,
    });

    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    expect(screen.queryByRole('columnheader', { name: /active alerts/i })).not.toBeInTheDocument();
  });

  it('renders the alerts badge as a link pointing to the service alerts locator', () => {
    render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

    const badge = screen.getByRole('link', { name: '3' });
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('href')).toContain('serviceAlertsLocator');
    expect(badge.getAttribute('href')).toContain('frontend-node');
  });

  it('resolves the max groups tooltip docs link through the doc links service', () => {
    mockedUseServiceFlyoutTransactionData.mockReturnValue({
      ...DEFAULT_HOOK_RESULT,
      items: [
        ...FIXTURE_ITEMS,
        {
          name: '_other',
          transactionType: 'request',
          latency: { value: null },
          throughput: { value: 0 },
          errorRate: { value: null },
          alertsCount: 0,
        },
      ],
      maxCountExceeded: true,
    });

    render(
      <IntlProvider locale="en">
        <ServiceFlyoutTransactionsSection {...BASE_PROPS} />
      </IntlProvider>
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'More information about remaining transactions' })
    );

    expect(screen.getByTestId('apmMaxGroupsTooltipDocsLink')).toHaveAttribute(
      'href',
      TROUBLESHOOTING_DOCS_HREF
    );
  });

  describe('sparkline loading state', () => {
    let capturedIsSparklineLoading: boolean | undefined;
    let tableSpy: jest.SpyInstance;

    beforeEach(() => {
      capturedIsSparklineLoading = undefined;
      tableSpy = jest
        .spyOn(TransactionsTableModule, 'TransactionsTable')
        .mockImplementation(({ isSparklineLoading }) => {
          capturedIsSparklineLoading = isSparklineLoading;
          return null as unknown as React.ReactElement;
        });
    });

    afterEach(() => {
      tableSpy.mockRestore();
    });

    it('passes isSparklineLoading={true} to TransactionsTable while detailed stats are loading', () => {
      mockedUseServiceFlyoutTransactionData.mockReturnValue({
        ...DEFAULT_HOOK_RESULT,
        isSparklineLoading: true,
      });

      render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

      expect(capturedIsSparklineLoading).toBe(true);
    });

    it('passes isSparklineLoading={false} to TransactionsTable once detailed stats have loaded', () => {
      render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

      expect(capturedIsSparklineLoading).toBe(false);
    });
  });

  describe('items passthrough', () => {
    let capturedItems: unknown[] = [];
    let tableSpy: jest.SpyInstance;

    beforeEach(() => {
      capturedItems = [];
      tableSpy = jest
        .spyOn(TransactionsTableModule, 'TransactionsTable')
        .mockImplementation(({ items }) => {
          capturedItems = items;
          return null as unknown as React.ReactElement;
        });
    });

    afterEach(() => {
      tableSpy.mockRestore();
    });

    it('passes items from the hook directly to TransactionsTable', () => {
      render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

      expect(capturedItems).toEqual(FIXTURE_ITEMS);
    });

    it('passes items with sparkline series when hook returns them', () => {
      const itemsWithSeries = [
        {
          ...FIXTURE_ITEMS[0],
          latency: { value: 1200000, series: { value: [{ x: 1, y: 200 }] } },
        },
        FIXTURE_ITEMS[1],
      ];
      mockedUseServiceFlyoutTransactionData.mockReturnValue({
        ...DEFAULT_HOOK_RESULT,
        items: itemsWithSeries,
      });

      render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

      expect((capturedItems as any[])[0].latency.series).toEqual({ value: [{ x: 1, y: 200 }] });
      expect((capturedItems as any[])[1].latency.series).toBeUndefined();
    });
  });

  describe('error state', () => {
    it('renders the error callout when the hook returns an error', () => {
      mockedUseServiceFlyoutTransactionData.mockReturnValue({
        ...DEFAULT_HOOK_RESULT,
        error: new Error('network error'),
        items: [],
      });

      render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

      expect(screen.getByText('Failed to load transaction data')).toBeInTheDocument();
    });

    it('does not render the error callout when there is no error', () => {
      render(<ServiceFlyoutTransactionsSection {...BASE_PROPS} />);

      expect(screen.queryByText('Failed to load transaction data')).not.toBeInTheDocument();
    });
  });
});
