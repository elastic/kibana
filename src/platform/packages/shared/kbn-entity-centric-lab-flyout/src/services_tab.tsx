/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useId, useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

type SloStatus = 'Met' | 'Breaching' | 'Degrading' | 'No SLO';

type SparklineTrend = 'up' | 'down' | 'flat';

interface HostedService {
  readonly name: string;
  readonly sloStatus: SloStatus;
  readonly language: string;
  readonly latencyMs: number;
  readonly transactionsPerMin: number;
  readonly errorRate: number;
  readonly latencySeries: readonly number[];
  readonly errorSeries: readonly number[];
  readonly throughputSeries: readonly number[];
}

interface ServicesTabProps {
  readonly entityName: string;
}

const SPARKLINE_COLOR = {
  latency: '#70A0F8',
  throughput: '#5CC2BF',
  errors: '#E67A6F',
} as const;

interface ServiceSeed {
  readonly name: string;
  readonly sloStatus: SloStatus;
  readonly language: string;
  readonly latencyMs: number;
  readonly transactionsPerMin: number;
  readonly errorRate: number;
}

const SPARKLINE_POINTS = 16;

const buildSparkline = (
  seed: number,
  endValue: number,
  trend: SparklineTrend
): readonly number[] => {
  const points: number[] = [];
  for (let index = 0; index < SPARKLINE_POINTS; index++) {
    const progress = index / (SPARKLINE_POINTS - 1);
    const noise = (((seed + 1) * (index + 7) * 13) % 17) / 17 - 0.5;
    let trendOffset = 0;
    if (trend === 'up') {
      trendOffset = (progress - 1) * endValue * 0.55;
    } else if (trend === 'down') {
      trendOffset = (1 - progress) * endValue * 0.4;
    }
    const value = Math.max(0, endValue + trendOffset + noise * endValue * 0.14);
    points.push(index === SPARKLINE_POINTS - 1 ? endValue : value);
  }
  return points;
};

const trendsForStatus = (
  status: SloStatus
): {
  readonly latency: SparklineTrend;
  readonly errors: SparklineTrend;
  readonly throughput: SparklineTrend;
} => {
  if (status === 'Breaching') {
    return { latency: 'up', errors: 'up', throughput: 'down' };
  }
  if (status === 'Degrading') {
    return { latency: 'up', errors: 'up', throughput: 'flat' };
  }
  return { latency: 'flat', errors: 'flat', throughput: 'flat' };
};

const withSparklines = (service: ServiceSeed): HostedService => {
  const seed = service.name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const trends = trendsForStatus(service.sloStatus);
  return {
    ...service,
    latencySeries: buildSparkline(seed, service.latencyMs, trends.latency),
    errorSeries: buildSparkline(seed + 3, service.errorRate, trends.errors),
    throughputSeries: buildSparkline(seed + 7, service.transactionsPerMin, trends.throughput),
  };
};

const generateHostedServices = (hostName: string): readonly HostedService[] => {
  const seed = hostName.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const rng = (n: number): number => ((seed * 9301 + 49297) % 233280) % n;

  const servicePool: readonly ServiceSeed[] = [
    {
      name: 'payments-service',
      sloStatus: 'Met',
      language: 'Java',
      latencyMs: 86,
      transactionsPerMin: 1243,
      errorRate: 0.02,
    },
    {
      name: 'auth-service',
      sloStatus: 'Breaching',
      language: 'Go',
      latencyMs: 412,
      transactionsPerMin: 3891,
      errorRate: 1.88,
    },
    {
      name: 'order-service',
      sloStatus: 'Met',
      language: 'Node.js',
      latencyMs: 124,
      transactionsPerMin: 872,
      errorRate: 0.15,
    },
    {
      name: 'notification-service',
      sloStatus: 'Degrading',
      language: 'Python',
      latencyMs: 248,
      transactionsPerMin: 412,
      errorRate: 0.79,
    },
    {
      name: 'inventory-service',
      sloStatus: 'Met',
      language: 'Java',
      latencyMs: 41,
      transactionsPerMin: 2034,
      errorRate: 0.01,
    },
    {
      name: 'search-service',
      sloStatus: 'No SLO',
      language: 'Rust',
      latencyMs: 18,
      transactionsPerMin: 5210,
      errorRate: 0.04,
    },
    {
      name: 'user-profile-service',
      sloStatus: 'Met',
      language: 'Go',
      latencyMs: 97,
      transactionsPerMin: 1580,
      errorRate: 0.09,
    },
    {
      name: 'recommendation-engine',
      sloStatus: 'Degrading',
      language: 'Python',
      latencyMs: 336,
      transactionsPerMin: 290,
      errorRate: 0.66,
    },
  ];

  const count = 2 + rng(5);
  const start = rng(servicePool.length);
  const result: HostedService[] = [];
  for (let idx = 0; idx < count; idx++) {
    result.push(withSparklines(servicePool[(start + idx) % servicePool.length]));
  }
  return result;
};

const MetricSparkline = ({
  values,
  color,
}: {
  readonly values: readonly number[];
  readonly color: string;
}) => {
  const gradId = useId().replace(/:/g, '');
  const width = 64;
  const height = 18;
  const pad = 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - pad - ((value - min) / span) * (height - pad * 2),
  }));

  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let index = 0; index < pts.length - 1; index++) {
    const p0 = pts[Math.max(index - 1, 0)];
    const p1 = pts[index];
    const p2 = pts[index + 1];
    const p3 = pts[Math.min(index + 2, pts.length - 1)];
    const tension = 6;
    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;
    d +=
      ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)}` +
      ` ${cp2x.toFixed(1)},${cp2y.toFixed(1)}` +
      ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const areaD = `${d} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      css={css`
        display: block;
        flex-shrink: 0;
      `}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
};

const MetricCell = ({
  label,
  series,
  color,
}: {
  readonly label: string;
  readonly series: readonly number[];
  readonly color: string;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} justifyContent="flexEnd">
    <EuiFlexItem grow={false}>
      <EuiText size="s">{label}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <MetricSparkline values={series} color={color} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ServicesTab = ({ entityName }: ServicesTabProps) => {
  const services = useMemo(() => generateHostedServices(entityName), [entityName]);

  const columns = useMemo<Array<EuiBasicTableColumn<HostedService>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.nameColumn', {
          defaultMessage: 'Service',
        }),
        render: (name: string) => (
          <EuiLink onClick={() => {}}>
            {name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
      },
      {
        field: 'latencyMs',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.latencyColumn', {
          defaultMessage: 'Latency (avg.)',
        }),
        render: (_latencyMs: number, item: HostedService) => (
          <MetricCell
            label={i18n.translate('entityCentricLabFlyout.flyout.services.latencyValue', {
              defaultMessage: '{latency} ms',
              values: { latency: item.latencyMs },
            })}
            series={item.latencySeries}
            color={SPARKLINE_COLOR.latency}
          />
        ),
        align: 'right' as const,
      },
      {
        field: 'errorRate',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.errorsColumn', {
          defaultMessage: 'Failed transaction rate (avg.)',
        }),
        render: (rate: number, item: HostedService) => (
          <MetricCell
            label={i18n.translate('entityCentricLabFlyout.flyout.services.errorRateValue', {
              defaultMessage: '{rate}%',
              values: { rate: Number.isInteger(rate) ? String(rate) : rate.toFixed(2) },
            })}
            series={item.errorSeries}
            color={SPARKLINE_COLOR.errors}
          />
        ),
        align: 'right' as const,
      },
      {
        field: 'transactionsPerMin',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.throughputColumn', {
          defaultMessage: 'Throughput (avg.)',
        }),
        render: (tpm: number, item: HostedService) => (
          <MetricCell
            label={i18n.translate('entityCentricLabFlyout.flyout.services.throughputValue', {
              defaultMessage: '{throughput} tpm',
              values: { throughput: tpm.toFixed(1) },
            })}
            series={item.throughputSeries}
            color={SPARKLINE_COLOR.throughput}
          />
        ),
        align: 'right' as const,
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('entityCentricLabFlyout.flyout.services.title', {
                defaultMessage: 'Services running on {hostName}',
                values: { hostName: entityName },
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('entityCentricLabFlyout.flyout.services.count', {
              defaultMessage: '{count} {count, plural, one {service} other {services}}',
              values: { count: services.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable items={services as HostedService[]} columns={columns} tableLayout="auto" />
      <EuiSpacer size="m" />
      <EuiLink onClick={() => {}} data-test-subj="entityCentricLabServicesViewAllInApm">
        {i18n.translate('entityCentricLabFlyout.flyout.services.viewAllInApm', {
          defaultMessage: 'View all services in APM',
        })}{' '}
        <EuiIcon type="external" size="s" />
      </EuiLink>
    </>
  );
};
