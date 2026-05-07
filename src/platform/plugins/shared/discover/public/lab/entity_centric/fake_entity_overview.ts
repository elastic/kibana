/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Hard-coded mock data backing the entity-centric lab flyout. All numbers and
 * labels come from the design mockup — there is no real backend.
 */

export type EntityHealth = 'healthy' | 'degraded' | 'unhealthy';

export interface EntityTag {
  readonly label: string;
  readonly color: 'hollow' | 'success' | 'warning' | 'danger' | 'accent' | 'primary';
}

export interface GoldenSignal {
  readonly id: 'latency' | 'errorRate' | 'throughput';
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly color: 'warning' | 'danger' | 'success';
}

export interface EntityDetailRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface OwnershipContact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface EntityOverview {
  readonly displayName: string;
  readonly lastUpdate: string;
  readonly tags: readonly EntityTag[];
  readonly summary: {
    readonly text: string;
    readonly generatedAt: string;
  };
  readonly goldenSignals: readonly GoldenSignal[];
  readonly details: readonly EntityDetailRow[];
  readonly ownership: readonly OwnershipContact[];
  readonly securityIssueCount: number;
}

/**
 * Build a fake overview for a given service name. The shape mirrors the design
 * mockup — only the title is interpolated so the flyout looks specific to the
 * row the user clicked.
 */
export const buildFakeEntityOverview = (serviceName: string): EntityOverview => ({
  displayName: serviceName,
  lastUpdate: '2026-04-20',
  tags: [
    { label: 'Service', color: 'hollow' },
    { label: 'Unhealthy', color: 'danger' },
    { label: 'Production', color: 'hollow' },
    { label: `${serviceName} subset`, color: 'hollow' },
  ],
  summary: {
    text:
      `Error rate spiked 4 min ago following deployment v2.4.1. db-primary latency is elevated. ` +
      `Downstream checkout-service is affected. Suggested action: rollback v2.4.1 or investigate ` +
      `db-primary connection pool.`,
    generatedAt: 'Dec 12th, 2025 at 11:30',
  },
  goldenSignals: [
    {
      id: 'latency',
      label: 'Latency',
      value: '0.9s',
      delta: '+X% in last XX min',
      color: 'warning',
    },
    {
      id: 'errorRate',
      label: 'Error rate',
      value: '4.5%',
      delta: '+X% in last XX min',
      color: 'danger',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: '312req/s',
      delta: 'Stable in last XX min',
      color: 'success',
    },
  ],
  details: [
    { id: 'entityId', label: 'Entity id', value: 'entid1234567890' },
    { id: 'creationDate', label: 'Creation date', value: '2025-02-21' },
    { id: 'lastUpdate', label: 'Last update', value: '2026-04-20 @ 10:01:21.313' },
    { id: 'version', label: 'Version', value: 'V.4.2.11 (deployed 21min ago)' },
    { id: 'previousVersion', label: 'Previous version', value: 'V.4.2.10' },
  ],
  ownership: [
    { id: 'team', label: 'Checkout-platform', value: 'slack #checkout-platform' },
    { id: 'contact', label: 'Another contact', value: 'contact@example.com' },
  ],
  securityIssueCount: 5,
});
