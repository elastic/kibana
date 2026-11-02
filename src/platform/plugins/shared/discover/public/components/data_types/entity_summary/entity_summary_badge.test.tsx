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
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { FeaturesRegistry } from '@kbn/discover-shared-plugin/common';
import type {
  DiscoverFeature,
  ObservabilityTracesServiceSummaryData,
} from '@kbn/discover-shared-plugin/public';
import type { EntitySummaryLink } from '@kbn/discover-contextual-components';
import { discoverServiceMock } from '../../../__mocks__/services';
import {
  EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  type ContextAwarenessToolkit,
} from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { EntitySummaryBadge } from './entity_summary_badge';
import { createServiceSummaryDefinition } from './definitions/service_summary_definition';

jest.mock('../../../hooks/use_discover_services');

const SERVICE_SUMMARY_FEATURE_ID = 'observability-traces-fetch-service-summary';

const summaryData: ObservabilityTracesServiceSummaryData = {
  latency: { series: [{ x: 1, y: null }], valueLabel: '1,000 ms' },
  throughput: { series: [{ x: 1, y: null }], valueLabel: '46 tpm' },
  failedTransactionRate: { series: [{ x: 1, y: null }], valueLabel: 'N/A' },
  activeAlertCount: 2,
  slo: { status: 'violated', count: 1, total: 3 },
  links: {
    serviceOverview: 'http://localhost/overview',
    alerts: 'http://localhost/alerts',
    slos: 'http://localhost/slos',
  },
};

const serviceSummaryFeature = (
  fetchServiceSummary = jest.fn().mockResolvedValue(summaryData)
): DiscoverFeature => ({ id: SERVICE_SUMMARY_FEATURE_ID, fetchServiceSummary });

const mockServicesWith = (feature?: DiscoverFeature) => {
  const registry = new FeaturesRegistry<DiscoverFeature>();
  if (feature) {
    registry.register(feature);
  }
  jest.mocked(useDiscoverServices).mockReturnValue({
    ...discoverServiceMock,
    discoverShared: { features: { registry } },
  });
};

const toolkit: ContextAwarenessToolkit = {
  ...EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  actions: { ...EMPTY_CONTEXT_AWARENESS_TOOLKIT.actions, addFilter: jest.fn() },
};

const serviceRow = buildDataTableRecord(
  {
    fields: {
      'service.name': 'checkoutService',
      'agent.name': 'nodejs',
      'service.environment': 'production',
    },
  },
  dataViewMock
);

describe('EntitySummaryBadge', () => {
  it('opens the service summary popover and renders metrics and links from the fetched data', async () => {
    const fetchServiceSummary = jest.fn().mockResolvedValue(summaryData);
    mockServicesWith(serviceSummaryFeature(fetchServiceSummary));

    render(
      <EntitySummaryBadge
        row={serviceRow}
        fieldName="service.name"
        definition={createServiceSummaryDefinition()}
        toolkit={toolkit}
      />
    );

    // Data is fetched lazily — the popover is closed and nothing is fetched until the chip is opened.
    expect(screen.queryByTestId('entitySummaryPanel')).not.toBeInTheDocument();
    expect(fetchServiceSummary).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('entitySummaryBadge-badge'));

    expect(await screen.findByTestId('entitySummaryPanel')).toBeVisible();
    // The latency value only appears once the lazy fetch resolves, so this waits for the settled
    // popover before asserting on the fetched metrics.
    expect(await screen.findByText('1,000 ms')).toBeVisible();
    expect(fetchServiceSummary).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Latency (avg)')).toBeVisible();

    const title = screen.getByRole('link', { name: 'checkoutService' });
    expect(title).toHaveAttribute('href', summaryData.links.serviceOverview);
    expect(screen.getByRole('link', { name: /Active alerts/ })).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: /SLOs/ })).toBeVisible();
  });

  it('renders a placeholder when the row has no service name', () => {
    mockServicesWith(serviceSummaryFeature());
    const emptyRow = buildDataTableRecord({ fields: { 'agent.name': 'nodejs' } }, dataViewMock);

    render(
      <EntitySummaryBadge
        row={emptyRow}
        fieldName="service.name"
        definition={createServiceSummaryDefinition()}
        toolkit={toolkit}
      />
    );

    expect(screen.getByTestId('entitySummaryBadge-empty')).toBeVisible();
    expect(screen.queryByTestId('entitySummaryBadge-badge')).not.toBeInTheDocument();
  });

  it('applies the profile customizeLinks reducer, appending to the base links', async () => {
    mockServicesWith(serviceSummaryFeature());
    const customizeLinks = (baseLinks: EntitySummaryLink[]): EntitySummaryLink[] => [
      ...baseLinks,
      { id: 'logs', label: 'Open in Logs', iconType: 'logsApp', href: 'http://localhost/logs' },
    ];

    render(
      <EntitySummaryBadge
        row={serviceRow}
        fieldName="service.name"
        definition={createServiceSummaryDefinition({ customizeLinks })}
        toolkit={toolkit}
      />
    );

    await userEvent.click(screen.getByTestId('entitySummaryBadge-badge'));

    // Wait for the lazy fetch to resolve before asserting on the composed links.
    expect(await screen.findByText('1,000 ms')).toBeVisible();
    expect(screen.getByRole('link', { name: /Open in Logs/ })).toBeVisible();
    // The base links are preserved alongside the profile's addition.
    expect(screen.getByRole('link', { name: /Active alerts/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /SLOs/ })).toBeVisible();
  });
});
