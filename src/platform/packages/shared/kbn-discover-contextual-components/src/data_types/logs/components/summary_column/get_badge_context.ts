/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import {
  contextualBadgePopoverCpuUsageLabel,
  contextualBadgePopoverDurationLabel,
  contextualBadgePopoverFailureRateLabel,
  contextualBadgePopoverLatencyP95Label,
  contextualBadgePopoverLogRateLabel,
  contextualBadgePopoverMemoryUsageLabel,
  contextualBadgePopoverPodsReadyLabel,
  contextualBadgePopoverThroughputLabel,
} from '../translations';

export type BadgeContextKind = 'service' | 'host' | 'container' | 'cluster' | 'trace' | 'generic';

const FIELD_KIND_BY_SUFFIX: Array<[string, BadgeContextKind]> = [
  ['service.name', 'service'],
  ['host.name', 'host'],
  ['container.name', 'container'],
  ['container.id', 'container'],
  ['transaction.name', 'trace'],
  ['span.name', 'trace'],
  ['event.outcome', 'trace'],
  ['transaction.duration.us', 'trace'],
  ['span.duration.us', 'trace'],
  ['orchestrator.cluster.name', 'cluster'],
  ['k8s.cluster.name', 'cluster'],
];

const fieldMatchesSuffix = (fieldName: string, suffix: string): boolean =>
  fieldName === suffix || fieldName.endsWith(`.${suffix}`);

export const getBadgeContextKind = (fieldName: string): BadgeContextKind => {
  const match = FIELD_KIND_BY_SUFFIX.find(([suffix]) => fieldMatchesSuffix(fieldName, suffix));
  return match?.[1] ?? 'generic';
};

export const shouldOfferRelatedLogs = (kind: BadgeContextKind): boolean =>
  kind === 'service' ||
  kind === 'host' ||
  kind === 'container' ||
  kind === 'cluster' ||
  kind === 'generic';

export const shouldOfferRelatedTraces = (kind: BadgeContextKind): boolean =>
  kind === 'service' || kind === 'trace';

export const shouldOfferInfrastructureMetrics = (kind: BadgeContextKind): boolean =>
  kind === 'service' || kind === 'host' || kind === 'cluster' || kind === 'container';

export const shouldOfferLogsObservabilityLinks = (
  kind: BadgeContextKind,
  isTracesSummary: boolean
): boolean => !isTracesSummary && kind !== 'trace';

const TRACES_INDEX_PATTERN = createRegExpPatternFrom(['trace', 'traces'], 'data');
const matchesTracesIndexPattern = testPatternAgainstAllowedList([TRACES_INDEX_PATTERN]);

export const isTracesDataViewPattern = (indexPattern: string | undefined | null): boolean =>
  Boolean(indexPattern && matchesTracesIndexPattern(indexPattern));

export const getKindIcon = (kind: BadgeContextKind): string => {
  switch (kind) {
    case 'service':
      return 'logoAWS';
    case 'host':
      return 'compute';
    case 'container':
      return 'logoDocker';
    case 'cluster':
      return 'logoKubernetes';
    case 'trace':
      return 'timeline';
    default:
      return 'tokenString';
  }
};

export type BadgeMetricVisIndex = 1 | 2 | 4 | 5 | 7;

export interface BadgeMetricPreview {
  label: string;
  value: string;
  trend: string;
  trendDirection: 'up' | 'down';
  isHealthyTrend: boolean;
  points: number[];
  visIndex: BadgeMetricVisIndex;
}

const LATENCY_WAVE = [8, 11, 18, 14, 22, 16, 12, 24, 19, 13, 21, 15, 17];
const CPU_PLATEAU = [18, 19, 21, 22, 20, 24, 23, 21, 19, 22, 25, 23, 22];
const MEMORY_CLIMB = [8, 9, 10, 12, 11, 14, 16, 15, 18, 20, 19, 22, 24];
const PODS_STABLE = [22, 22, 21, 22, 20, 14, 18, 22, 22, 21, 22, 22, 21];
const DURATION_SPIKE = [6, 7, 8, 28, 18, 12, 9, 8, 10, 7, 8, 9, 7];
const THROUGHPUT_BURST = [10, 12, 9, 14, 18, 22, 16, 12, 20, 24, 18, 15, 13];
const FAILURE_SPIKES = [4, 5, 18, 6, 5, 22, 7, 6, 5, 16, 6, 5, 4];
const LOG_NOISE = [12, 16, 11, 18, 14, 20, 13, 17, 22, 15, 12, 19, 16];

const seedFrom = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }
  return hash;
};

const pickVariant = <T>(variants: T[], seed: number): T => variants[seed % variants.length];

export const getActiveAlertsCount = (fieldName: string, textValue: string): number => {
  const seed = seedFrom(`${fieldName}:${textValue}`);
  return [2, 2, 1, 4, 2, 0][seed % 6];
};

export const getErrorsFoundCount = (fieldName: string, textValue: string): number => {
  const seed = seedFrom(`errors:${fieldName}:${textValue}`);
  return [3, 3, 1, 5, 3, 0][seed % 6];
};

export const getBadgeMetricPreview = (fieldName: string, textValue: string): BadgeMetricPreview => {
  const kind = getBadgeContextKind(fieldName);
  const seed = seedFrom(`${fieldName}:${textValue}`);

  if (fieldName.endsWith('event.outcome') || fieldName === 'event.outcome') {
    return pickVariant(
      [
        {
          label: contextualBadgePopoverFailureRateLabel,
          value: '2.1%',
          trend: '0.4%',
          trendDirection: 'up',
          isHealthyTrend: false,
          points: FAILURE_SPIKES,
          visIndex: 7,
        },
        {
          label: contextualBadgePopoverFailureRateLabel,
          value: '0.3%',
          trend: '1.1%',
          trendDirection: 'down',
          isHealthyTrend: true,
          points: [6, 8, 5, 12, 7, 6, 5, 9, 6, 5, 7, 6, 5],
          visIndex: 7,
        },
      ],
      seed
    );
  }

  if (fieldName.endsWith('transaction.name') || fieldName === 'transaction.name') {
    return {
      label: contextualBadgePopoverThroughputLabel,
      value: pickVariant(['142/min', '88/min', '210/min'], seed),
      trend: pickVariant(['6.8%', '3.1%'], seed),
      trendDirection: 'up',
      isHealthyTrend: true,
      points: THROUGHPUT_BURST,
      visIndex: 2,
    };
  }

  switch (kind) {
    case 'service':
      return pickVariant(
        [
          {
            label: contextualBadgePopoverLatencyP95Label,
            value: '12.4ms',
            trend: '4.1%',
            trendDirection: 'up',
            isHealthyTrend: false,
            points: LATENCY_WAVE,
            visIndex: 1,
          },
          {
            label: contextualBadgePopoverLatencyP95Label,
            value: '3.8ms',
            trend: '2.2%',
            trendDirection: 'down',
            isHealthyTrend: true,
            points: [16, 15, 14, 18, 13, 12, 14, 11, 12, 10, 11, 9, 10],
            visIndex: 1,
          },
        ],
        seed
      );
    case 'host': {
      const cpuImproving = seed % 2 === 0;
      return {
        label: contextualBadgePopoverCpuUsageLabel,
        value: pickVariant(['62%', '47%', '81%'], seed),
        trend: pickVariant(['3.2%', '5.6%'], seed),
        trendDirection: cpuImproving ? 'down' : 'up',
        isHealthyTrend: cpuImproving,
        points: CPU_PLATEAU,
        visIndex: 2,
      };
    }
    case 'container':
      return {
        label: contextualBadgePopoverMemoryUsageLabel,
        value: pickVariant(['418 MB', '1.2 GB', '256 MB'], seed),
        trend: pickVariant(['8.7%', '1.9%'], seed),
        trendDirection: 'up',
        isHealthyTrend: false,
        points: MEMORY_CLIMB,
        visIndex: 4,
      };
    case 'cluster':
      return {
        label: contextualBadgePopoverPodsReadyLabel,
        value: pickVariant(['48/52', '31/32', '12/12'], seed),
        trend: pickVariant(['1.9%', '0.0%'], seed),
        trendDirection: 'down',
        isHealthyTrend: true,
        points: PODS_STABLE,
        visIndex: 5,
      };
    case 'trace':
      return {
        label: contextualBadgePopoverDurationLabel,
        value: pickVariant(['86ms', '240ms', '14ms'], seed),
        trend: pickVariant(['12.0%', '4.5%'], seed),
        trendDirection: 'up',
        isHealthyTrend: false,
        points: DURATION_SPIKE,
        visIndex: 7,
      };
    default:
      return {
        label: contextualBadgePopoverLogRateLabel,
        value: pickVariant(['1.2k/min', '340/min', '88/min'], seed),
        trend: pickVariant(['2.4%', '7.1%'], seed),
        trendDirection: 'up',
        isHealthyTrend: true,
        points: LOG_NOISE,
        visIndex: 5,
      };
  }
};
