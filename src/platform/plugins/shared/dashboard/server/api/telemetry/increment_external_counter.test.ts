/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDashboardApiTelemetryFacade } from '../../request_handler_context';
import { counterNames } from './increment_external_counter';

describe('dashboard api telemetry - ctx.dashboardApi.telemetry facade', () => {
  it('is a noop when usageCounter is unavailable', () => {
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter: undefined,
      isDashboardUiRequest: false,
    });
    expect(() => telemetry.incrementExternal('external_read')).not.toThrow();
    expect(() =>
      telemetry.incrementExternalByType({
        totalCounterName: 'external_read_stripped_panels_total',
        byTypeCounterName: (t) => `external_read_stripped_panels_type_${t}`,
        byType: { lens: 1 },
      })
    ).not.toThrow();
  });

  it('does not increment for Dashboard UI request', () => {
    const usageCounter = { incrementCounter: jest.fn() } as any;
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter,
      isDashboardUiRequest: true,
    });
    telemetry.incrementExternal('external_read');
    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  it('increments for external request and aggregates by type', () => {
    const usageCounter = { incrementCounter: jest.fn() } as any;
    const telemetry = createDashboardApiTelemetryFacade({
      usageCounter,
      isDashboardUiRequest: false,
    });
    telemetry.incrementExternal('external_read');
    telemetry.incrementExternalByType({
      totalCounterName: 'external_read_stripped_panels_total',
      byTypeCounterName: (t) => `external_read_stripped_panels_type_${t}`,
      byType: { lens: 2, map: 1 },
    });

    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: 'external_read',
      incrementBy: undefined,
    });
    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(2, {
      counterName: 'external_read_stripped_panels_total',
      incrementBy: 3,
    });
    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(3, {
      counterName: 'external_read_stripped_panels_type_lens',
      incrementBy: 2,
    });
    expect(usageCounter.incrementCounter).toHaveBeenNthCalledWith(4, {
      counterName: 'external_read_stripped_panels_type_map',
      incrementBy: 1,
    });
  });

  it('sanitizes dynamic counter name parts', () => {
    expect(counterNames.externalReadStrippedPanelsByType('anthropic/claude-3-opus')).toBe(
      'external_read_stripped_panels_type_anthropic_claude-3-opus'
    );
    expect(counterNames.externalReadStrippedPanelsByType('!@#$%^&*()')).toBe(
      'external_read_stripped_panels_type_unknown'
    );
  });
});
