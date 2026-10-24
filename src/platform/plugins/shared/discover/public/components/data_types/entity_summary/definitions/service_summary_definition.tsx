/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import {
  getFieldValue,
  AGENT_NAME_FIELD,
  OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
  SERVICE_ENVIRONMENT_FIELD,
} from '@kbn/discover-utils';
import type { EntitySummaryLink, EntitySummaryMetric } from '@kbn/discover-contextual-components';
import type {
  ObservabilityTracesServiceSummaryData,
  ObservabilityTracesServiceSummarySlo,
} from '@kbn/discover-shared-plugin/public';
import type {
  EntitySummaryContent,
  EntitySummaryCustomizeLinks,
  EntitySummaryDefinition,
} from '../types';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const palette = euiPaletteColorBlind({ rotations: 2 });
const loadingLabel = '—';

const SERVICE_SUMMARY_FEATURE_ID = 'observability-traces-fetch-service-summary';

export type ServiceSummaryRawData = ObservabilityTracesServiceSummaryData;

export interface CreateServiceSummaryDefinitionArgs {
  /** Lets a profile (logs, traces, …) add/replace/reorder/hide the service's links. */
  customizeLinks?: EntitySummaryCustomizeLinks<ServiceSummaryRawData>;
}

/**
 * The `service` entity: identified by a service-name field, backed by APM's service-summary data
 * feature. Keeps the concrete APM data contract while exposing the generic popover content.
 */
export const createServiceSummaryDefinition = ({
  customizeLinks,
}: CreateServiceSummaryDefinitionArgs = {}): EntitySummaryDefinition<ServiceSummaryRawData> => ({
  entityType: 'service',

  isAvailable: (registry) => Boolean(registry.getById(SERVICE_SUMMARY_FEATURE_ID)),

  getEntity: ({ row, fieldName }) => {
    const value = getFieldValue(row, fieldName);
    const serviceName = typeof value === 'string' ? value : '';

    if (!serviceName) {
      return undefined;
    }

    const agentName = getFieldValue(row, AGENT_NAME_FIELD) as AgentName;
    const otelSdkLanguage = getFieldValue(row, OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE) as
      | AgentName
      | undefined;
    const environmentValue = getFieldValue(row, SERVICE_ENVIRONMENT_FIELD);
    const environment = typeof environmentValue === 'string' ? environmentValue : undefined;
    const agentNameIcon = otelSdkLanguage || agentName;

    return {
      identifier: serviceName,
      label: serviceName,
      subtitle: [environment, agentNameIcon].filter(Boolean).join(' · ') || undefined,
      iconTooltip: agentNameIcon,
      renderIcon: (size) => <AgentIcon agentName={agentNameIcon} size={size} />,
      fetchParams: { environment },
    };
  },

  fetch: async ({ registry, entity, timeRange, signal }) => {
    const feature = registry.getById(SERVICE_SUMMARY_FEATURE_ID);
    if (!feature) {
      return null;
    }

    return feature.fetchServiceSummary(
      {
        serviceName: entity.identifier,
        environment: entity.fetchParams?.environment,
        start: timeRange.start,
        end: timeRange.end,
      },
      signal
    );
  },

  mapToContent: ({ data }) => getContent(data),

  customizeLinks,
});

const activeAlertsLabel = i18n.translate('discover.serviceSummary.activeAlerts', {
  defaultMessage: 'Active alerts',
});
const slosLabel = i18n.translate('discover.serviceSummary.slos', {
  defaultMessage: 'SLOs',
});

const getContent = (data: ServiceSummaryRawData | null): EntitySummaryContent => {
  const activeAlertCount = data?.activeAlertCount ?? 0;
  const linkTargets = data?.links;

  const links: EntitySummaryLink[] = [
    {
      id: 'alerts',
      label: activeAlertsLabel,
      iconType: 'bell',
      external: true,
      badgeLabel: activeAlertCount,
      badgeColor: activeAlertCount > 0 ? 'danger' : 'hollow',
      href: linkTargets?.alerts,
    },
    {
      id: 'slos',
      label: slosLabel,
      iconType: 'chartGauge',
      external: true,
      // Surface a count badge only when SLOs are actually having problems.
      ...getSloBadge(data?.slo),
      href: linkTargets?.slos,
    },
  ];

  return {
    metrics: getMetrics(data),
    links,
    titleHref: linkTargets?.serviceOverview,
  };
};

// Only highlight SLOs that need attention: violated (danger) or degrading (warning). Healthy, no
// data, and no-SLO services get a plain link without a badge.
const getSloBadge = (
  slo: ObservabilityTracesServiceSummarySlo | undefined
): Pick<EntitySummaryLink, 'badgeLabel' | 'badgeColor'> => {
  if (slo?.status === 'violated') {
    return { badgeLabel: slo.count, badgeColor: 'danger' };
  }
  if (slo?.status === 'degrading') {
    return { badgeLabel: slo.count, badgeColor: 'warning' };
  }
  return {};
};

const getMetrics = (data: ServiceSummaryRawData | null): EntitySummaryMetric[] => [
  {
    label: i18n.translate('discover.serviceSummary.latency', {
      defaultMessage: 'Latency (avg)',
    }),
    valueLabel: data?.latency.valueLabel ?? loadingLabel,
    color: palette[1],
    series: data?.latency.series ?? null,
  },
  {
    label: i18n.translate('discover.serviceSummary.throughput', {
      defaultMessage: 'Throughput (avg)',
    }),
    valueLabel: data?.throughput.valueLabel ?? loadingLabel,
    color: palette[2],
    series: data?.throughput.series ?? null,
  },
  {
    label: i18n.translate('discover.serviceSummary.errorRate', {
      defaultMessage: 'Error rate (avg)',
    }),
    valueLabel: data?.failedTransactionRate.valueLabel ?? loadingLabel,
    color: palette[6],
    series: data?.failedTransactionRate.series ?? null,
  },
];
