/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { ContextualBadgePopover } from './contextual_badge_popover';
import {
  getBadgeContextKind,
  isTracesDataViewPattern,
  shouldOfferInfrastructureMetrics,
  shouldOfferRelatedLogs,
  shouldOfferRelatedTraces,
} from './get_badge_context';

describe('getBadgeContextKind', () => {
  it('maps service, host, and trace field names', () => {
    expect(getBadgeContextKind('service.name')).toBe('service');
    expect(getBadgeContextKind('resource.attributes.service.name')).toBe('service');
    expect(getBadgeContextKind('host.name')).toBe('host');
    expect(getBadgeContextKind('transaction.name')).toBe('trace');
    expect(getBadgeContextKind('orchestrator.cluster.name')).toBe('cluster');
    expect(getBadgeContextKind('agent.name')).toBe('generic');
  });

  it('detects traces data view index patterns', () => {
    expect(isTracesDataViewPattern('traces-poc.summary-default')).toBe(true);
    expect(isTracesDataViewPattern('traces-*')).toBe(true);
    expect(isTracesDataViewPattern('logs-poc.summary-default')).toBe(false);
  });

  it('offers related logs, traces, and infra based on kind', () => {
    expect(shouldOfferRelatedLogs('service')).toBe(true);
    expect(shouldOfferRelatedTraces('service')).toBe(true);
    expect(shouldOfferInfrastructureMetrics('service')).toBe(true);
    expect(shouldOfferRelatedLogs('trace')).toBe(false);
    expect(shouldOfferRelatedTraces('trace')).toBe(true);
    expect(shouldOfferRelatedLogs('host')).toBe(true);
    expect(shouldOfferRelatedTraces('host')).toBe(false);
  });
});

describe('ContextualBadgePopover', () => {
  it('renders the service contextual menu', async () => {
    const onFilterFor = jest.fn();
    const onOpenOverview = jest.fn();
    const onClose = jest.fn();

    render(
      <ContextualBadgePopover
        name="service.name"
        textValue="checkout-service"
        titleId="title"
        onFilterFor={onFilterFor}
        onFilterOut={jest.fn()}
        onOpenOverview={onOpenOverview}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('discoverContextualBadgePopover')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('checkout-service')).toBeInTheDocument();
    expect(screen.getByText('Latency p95')).toBeInTheDocument();
    expect(screen.getByTestId('discoverContextualBadgePopoverSparkline')).toBeInTheDocument();

    await userEvent.click(
      screen.getByTestId('discoverContextualBadgePopover_openOverview_service.name')
    );
    expect(onOpenOverview).toHaveBeenCalledTimes(1);
    expect(onFilterFor).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByTestId('discoverContextualBadgePopover_nodeHealth_service.name')
    );
    expect(onFilterFor).toHaveBeenCalled();

    expect(
      screen.getByTestId('discoverContextualBadgePopover_activeAlerts_service.name')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('discoverContextualBadgePopover_viewTraces_service.name')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('discoverContextualBadgePopover_infraMetrics_service.name')
    ).toBeInTheDocument();
  });

  it('hides trace exploration for host badges', () => {
    render(
      <ContextualBadgePopover
        name="host.name"
        textValue="synth-host"
        titleId="title"
        onFilterFor={() => {}}
        onFilterOut={() => {}}
        onClose={() => {}}
      />
    );

    expect(
      screen.getByTestId('discoverContextualBadgePopover_nodeHealth_host.name')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('discoverContextualBadgePopover_viewTraces_host.name')
    ).not.toBeInTheDocument();
    expect(screen.getByText('CPU usage')).toBeInTheDocument();
  });

  it('renders traces navigation links', () => {
    render(
      <ContextualBadgePopover
        name="service.name"
        textValue="checkout-service"
        titleId="title"
        isTracesSummary={true}
        onFilterFor={() => {}}
        onFilterOut={() => {}}
        onOpenOverview={() => {}}
        onClose={() => {}}
      />
    );

    expect(
      screen.getByTestId('discoverContextualBadgePopover_serviceMap_service.name')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('discoverContextualBadgePopover_errorsFound_service.name')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('discoverContextualBadgePopover_viewLogs_service.name')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('discoverContextualBadgePopover_nodeHealth_service.name')
    ).not.toBeInTheDocument();
  });
});
