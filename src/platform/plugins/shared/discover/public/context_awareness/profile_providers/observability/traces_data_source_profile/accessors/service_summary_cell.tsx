/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiPopover, euiPaletteColorBlind } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  getFieldValue,
  OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
  SERVICE_ENVIRONMENT_FIELD,
} from '@kbn/discover-utils';
import {
  ServiceSummary,
  type ServiceSummaryLink,
  type ServiceSummaryMetric,
} from '@kbn/apm-ui-shared';
import type {
  ObservabilityTracesServiceSummaryData,
  ObservabilityTracesServiceSummarySlo,
} from '@kbn/discover-shared-plugin/public';
import type { ContextAwarenessToolkit } from '../../../../toolkit';
import { AGENT_NAME_FIELD } from '../../../../../../common/data_types/logs/constants';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useFetchServiceSummary } from './use_fetch_service_summary';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const dataTestSubj = 'tracesServiceSummaryCell';
const palette = euiPaletteColorBlind({ rotations: 2 });
// APM's sentinel for "all environments"; mirrors ENVIRONMENT_ALL_VALUE from @kbn/apm-types without
// pulling an APM dependency into Discover.
const ALL_ENVIRONMENTS = 'ENVIRONMENT_ALL';
const FLYOUT_SOURCE = 'discover_traces_service_summary';

const badgeStyle = css`
  max-width: 100%;
`;

/**
 * Traces-profile service badge: clicking it opens the service summary popover.
 *
 * Data (latency / throughput / error-rate series, active alerts, and link targets) is provided
 * through the `discover_shared` features registry, which APM fulfils — Discover never calls the APM
 * internal routes or builds APM URLs directly. "Open overview" opens the APM service flyout in
 * place via the `observability-service-flyout` feature; the rest open the APM app in a new tab.
 */
export const getServiceSummaryCell =
  (serviceNameField: string, toolkit: ContextAwarenessToolkit) =>
  (props: DataGridCellValueElementProps) => {
    const serviceNameValue = getFieldValue(props.row, serviceNameField);
    const agentName = getFieldValue(props.row, AGENT_NAME_FIELD) as AgentName;
    const otelSdkLanguage = getFieldValue(
      props.row,
      OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE
    ) as AgentName | undefined;
    const environmentValue = getFieldValue(props.row, SERVICE_ENVIRONMENT_FIELD);

    const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);
    const [isFlyoutOpen, { on: openFlyout, off: closeFlyout }] = useBoolean(false);

    const { discoverShared, core, data: dataService } = useDiscoverServices();
    const serviceFlyoutFeature = discoverShared.features.registry.getById(
      'observability-service-flyout'
    );
    const canOpenServiceFlyout =
      Boolean(serviceFlyoutFeature) && Boolean(core.application.capabilities.apm?.show);

    const serviceName = typeof serviceNameValue === 'string' ? serviceNameValue : '';
    const environment = typeof environmentValue === 'string' ? environmentValue : undefined;
    const agentNameIcon = otelSdkLanguage || agentName;

    const { loading, data } = useFetchServiceSummary({
      serviceName,
      environment,
      enabled: isPopoverOpen,
    });

    const metrics = useMemo(() => getMetrics(data), [data]);
    const activeAlertCount = data?.activeAlertCount ?? 0;
    const slo = data?.slo;
    const linkTargets = data?.links;
    const links = useMemo<ServiceSummaryLink[]>(
      () => [
        {
          label: openOverviewLabel,
          iconType: 'fullScreen',
          // Open the APM service flyout in place; fall back to navigating to the overview page
          // when the flyout feature isn't available (e.g. the user lacks APM access).
          href: canOpenServiceFlyout ? undefined : linkTargets?.serviceOverview,
          onClick: canOpenServiceFlyout
            ? () => {
                closePopover();
                openFlyout();
              }
            : closePopover,
        },
        {
          label: serviceMapLabel,
          iconType: 'graphApp',
          external: true,
          href: linkTargets?.serviceMap,
          onClick: closePopover,
        },
        {
          label: activeAlertsLabel,
          iconType: 'bell',
          external: true,
          badgeLabel: activeAlertCount,
          badgeColor: activeAlertCount > 0 ? 'danger' : 'hollow',
          href: linkTargets?.alerts,
          onClick: closePopover,
        },
        {
          label: slosLabel,
          iconType: 'chartGauge',
          external: true,
          // Surface a count badge only when SLOs are actually having problems.
          ...getSloBadge(slo),
          href: linkTargets?.slos,
          onClick: closePopover,
        },
        {
          label: infraMetricsLabel,
          iconType: 'storage',
          external: true,
          href: linkTargets?.infrastructure,
          onClick: closePopover,
        },
      ],
      [closePopover, linkTargets, activeAlertCount, slo, canOpenServiceFlyout, openFlyout]
    );

    if (!serviceName) {
      return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
    }

    const onFilter = (operator: '+' | '-') => () => {
      toolkit.actions.addFilter?.(serviceNameField, serviceNameValue, operator);
      closePopover();
    };

    const onCopyValue = () => {
      void navigator.clipboard?.writeText(serviceName);
      closePopover();
    };

    const trigger = (
      <EuiBadge
        color="hollow"
        css={badgeStyle}
        onClick={togglePopover}
        onClickAriaLabel={i18n.translate('discover.tracesServiceSummary.openAriaLabel', {
          defaultMessage: 'Open summary for service {serviceName}',
          values: { serviceName },
        })}
        data-test-subj={`${dataTestSubj}-badge`}
      >
        <AgentIcon agentName={agentNameIcon} size="s" /> {serviceName}
      </EuiBadge>
    );

    const { from: rangeFrom, to: rangeTo } = dataService.query.timefilter.timefilter.getTime();

    return (
      <>
        <EuiPopover
          button={trigger}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downLeft"
          panelPaddingSize="none"
          aria-label={i18n.translate('discover.tracesServiceSummary.popoverAriaLabel', {
            defaultMessage: 'Summary for service {serviceName}',
            values: { serviceName },
          })}
          data-test-subj={dataTestSubj}
        >
          <ServiceSummary
            serviceName={serviceName}
            environment={environment}
            agentName={agentNameIcon}
            icon={<AgentIcon agentName={agentNameIcon} size="l" />}
            metrics={metrics}
            links={links}
            isLoading={loading}
            onClose={closePopover}
            onFilterFor={onFilter('+')}
            onFilterOut={onFilter('-')}
            onCopyValue={onCopyValue}
          />
        </EuiPopover>
        {isFlyoutOpen && serviceFlyoutFeature
          ? serviceFlyoutFeature.renderServiceFlyout({
              service: { name: serviceName, agentName: agentNameIcon },
              filters: {
                environment: environment ?? ALL_ENVIRONMENTS,
                rangeFrom,
                rangeTo,
              },
              source: FLYOUT_SOURCE,
              onClose: closeFlyout,
            })
          : null}
      </>
    );
  };

const openOverviewLabel = i18n.translate('discover.tracesServiceSummary.openOverview', {
  defaultMessage: 'Open overview',
});
const serviceMapLabel = i18n.translate('discover.tracesServiceSummary.serviceMap', {
  defaultMessage: 'Service map',
});
const activeAlertsLabel = i18n.translate('discover.tracesServiceSummary.activeAlerts', {
  defaultMessage: 'Active alerts',
});
const infraMetricsLabel = i18n.translate('discover.tracesServiceSummary.infrastructureMetrics', {
  defaultMessage: 'Infrastructure metrics',
});
const slosLabel = i18n.translate('discover.tracesServiceSummary.slos', {
  defaultMessage: 'SLOs',
});
const loadingLabel = '—';

// Only highlight SLOs that need attention: violated (danger) or degrading (warning). Healthy, no
// data, and no-SLO services get a plain link without a badge.
function getSloBadge(
  slo: ObservabilityTracesServiceSummarySlo | undefined
): Pick<ServiceSummaryLink, 'badgeLabel' | 'badgeColor'> {
  if (slo?.status === 'violated') {
    return { badgeLabel: slo.count, badgeColor: 'danger' };
  }
  if (slo?.status === 'degrading') {
    return { badgeLabel: slo.count, badgeColor: 'warning' };
  }
  return {};
}

function getMetrics(data: ObservabilityTracesServiceSummaryData | null): ServiceSummaryMetric[] {
  return [
    {
      label: i18n.translate('discover.tracesServiceSummary.latency', {
        defaultMessage: 'Latency AVG',
      }),
      valueLabel: data?.latency.valueLabel ?? loadingLabel,
      color: palette[1],
      series: data?.latency.series ?? null,
    },
    {
      label: i18n.translate('discover.tracesServiceSummary.throughput', {
        defaultMessage: 'Throughput',
      }),
      valueLabel: data?.throughput.valueLabel ?? loadingLabel,
      color: palette[2],
      series: data?.throughput.series ?? null,
    },
    {
      label: i18n.translate('discover.tracesServiceSummary.errorRate', {
        defaultMessage: 'Error rate',
      }),
      valueLabel: data?.failedTransactionRate.valueLabel ?? loadingLabel,
      color: palette[3],
      series: data?.failedTransactionRate.series ?? null,
    },
  ];
}
