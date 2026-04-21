/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EntitySimulationTag {
  readonly label: string;
  readonly color: 'hollow' | 'primary' | 'danger' | 'warning';
}

export interface GoldenMetricSimulation {
  readonly title: string;
  readonly value: string;
  readonly delta: string;
  readonly accent: 'success' | 'warning' | 'danger';
}

export interface LogRowSimulation {
  readonly timestamp: string;
  readonly summary: string;
}

export interface AlertRowSimulation {
  readonly status: string;
  readonly triggered: string;
  readonly ruleName: string;
  readonly reason: string;
}

export type RelatedEntityHealth = 'healthy' | 'unhealthy' | 'unknown';

export interface RelatedEntitySimulation {
  readonly health: RelatedEntityHealth;
  readonly name: string;
  readonly entityType: string;
  readonly relationship: string;
}

export interface EntitySimulationModel {
  readonly name: string;
  readonly lastUpdateLabel: string;
  readonly tags: EntitySimulationTag[];
  readonly summary: string;
  readonly summaryDate: string;
  readonly goldenMetrics: GoldenMetricSimulation[];
  readonly entityId: string;
  readonly creationDate: string;
  readonly lastUpdatedDetail: string;
  readonly versionLabel: string;
  readonly deploymentLabel: string;
  readonly ownerSlack: string;
  readonly ownerEmail: string;
  readonly subsetLabel: string;
  readonly logsTitle: string;
  readonly logRows: LogRowSimulation[];
  readonly activeAlertsCount: number;
  readonly activeAlertsTotal: number;
  readonly alertRows: AlertRowSimulation[];
  readonly relatedEntities: RelatedEntitySimulation[];
  readonly latencySeries: Array<{ x: number; y: number }>;
  readonly errorRateSeries: Array<{ x: number; y: number }>;
  readonly throughputSeries: Array<{ x: number; y: number }>;
  readonly activeAlertsSeries: Array<{ x: number; y: number }>;
  readonly networkInSeries: Array<{ x: number; y: number }>;
  readonly networkOutSeries: Array<{ x: number; y: number }>;
}

const MS_HOUR = 60 * 60 * 1000;

function buildTimeSeries(
  base: number,
  points: number,
  waveAmplitude: number,
  drift: number
): Array<{ x: number; y: number }> {
  return Array.from({ length: points }, (_, i) => {
    const x = base - (points - i) * MS_HOUR;
    const y = waveAmplitude * Math.sin(i / 3) + drift + i * 0.02;
    return { x, y: Math.max(0, Number(y.toFixed(3))) };
  });
}

export function buildMockEntitySimulation(entityName: string): EntitySimulationModel {
  const safeName = entityName.trim() || 'unknown-service';
  const seed = safeName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const baseTime = Date.UTC(2024, 4, 30, 14, 0, 0) + (seed % 3600000);

  const unhealthy = safeName.toLowerCase().includes('payment') || seed % 4 === 0;

  return {
    name: safeName,
    lastUpdateLabel: '2024-05-30',
    tags: [
      { label: 'Service', color: 'primary' },
      { label: unhealthy ? 'Unhealthy' : 'Healthy', color: unhealthy ? 'danger' : 'hollow' },
      { label: 'Production', color: 'hollow' },
      { label: `${safeName.split('-')[0] ?? 'team'}-subset`, color: 'hollow' },
    ],
    summary: unhealthy
      ? `Error rate spiked 4 min ago following deployment v2.4.1. Primary latency is elevated. Several downstream services affected. Suggested action: rollback v2.4.1 or investigate the primary connection pool.`
      : `No anomalies detected in the last hour. Latency and error rate are within SLO. Last deployment v2.4.0 completed successfully.`,
    summaryDate: 'Dec 18, 2023',
    goldenMetrics: unhealthy
      ? [
          {
            title: 'Latency',
            value: '0.9s',
            delta: '+50% in last 10 min',
            accent: 'warning',
          },
          {
            title: 'Error rate',
            value: '4.5%',
            delta: '+15% in last 10 min',
            accent: 'danger',
          },
          {
            title: 'Throughput',
            value: '312 req/s',
            delta: 'stable in last 10 min',
            accent: 'success',
          },
        ]
      : [
          {
            title: 'Latency',
            value: '120ms',
            delta: 'stable in last 10 min',
            accent: 'success',
          },
          {
            title: 'Error rate',
            value: '0.1%',
            delta: 'stable in last 10 min',
            accent: 'success',
          },
          {
            title: 'Throughput',
            value: `${280 + (seed % 40)} req/s`,
            delta: '+2% in last 10 min',
            accent: 'success',
          },
        ],
    entityId: `prod-${21319765 + (seed % 1000)}`,
    creationDate: '2023-06-12',
    lastUpdatedDetail: '2 min ago',
    versionLabel: '8.12.2',
    deploymentLabel: unhealthy ? 'v2.4.1 deployed 2 min ago' : 'v2.4.0 deployed 3 days ago',
    ownerSlack: '@checkout-platform',
    ownerEmail: 'checkout-platform@example.com',
    subsetLabel: 'payments-subset',
    logsTitle: `Logs emitted by ${safeName}`,
    logRows: [
      {
        timestamp: '2024-05-30T13:58:01.234Z',
        summary: `[ERROR] connection pool exhausted — ${safeName} — /var/log/pods/checkout/${safeName}/app.log`,
      },
      {
        timestamp: '2024-05-30T13:57:44.112Z',
        summary: `[WARN] upstream timeout contacting checkout-api — trace_id=${seed.toString(16)}`,
      },
      {
        timestamp: '2024-05-30T13:56:02.881Z',
        summary: `[INFO] health check OK — region=us-east-1`,
      },
    ],
    activeAlertsCount: unhealthy ? 16 : 2,
    activeAlertsTotal: unhealthy ? 20 : 12,
    alertRows: [
      {
        status: 'Active',
        triggered: '2024-05-30T13:55:00.000Z',
        ruleName: 'APM service responsiveness',
        reason: `p95 latency above threshold for ${safeName}`,
      },
      {
        status: 'Delayed',
        triggered: '2024-05-30T13:50:00.000Z',
        ruleName: 'K8s memory usage limits',
        reason: 'Container approaching memory limit',
      },
    ],
    relatedEntities: [
      {
        health: 'unhealthy',
        name: 'checkout-api',
        entityType: 'Service',
        relationship: `Visited by ${safeName}`,
      },
      {
        health: 'healthy',
        name: 'gke-us-east-1-01',
        entityType: 'Host',
        relationship: `Hosting ${safeName}`,
      },
      {
        health: 'healthy',
        name: `pod/${safeName}-7d9c5b-xk2lq`,
        entityType: 'Pod',
        relationship: 'Runs workload',
      },
    ],
    latencySeries: buildTimeSeries(baseTime, 24, unhealthy ? 0.35 : 0.08, unhealthy ? 0.85 : 0.12),
    errorRateSeries: buildTimeSeries(baseTime, 24, unhealthy ? 2 : 0.2, unhealthy ? 4.2 : 0.15),
    throughputSeries: buildTimeSeries(baseTime, 24, 8, 300),
    activeAlertsSeries: buildTimeSeries(baseTime, 24, 2, unhealthy ? 15 : 3),
    networkInSeries: buildTimeSeries(baseTime, 24, 50, 420),
    networkOutSeries: buildTimeSeries(baseTime, 24, 45, 380),
  };
}
