/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  type DataTableRecord,
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
import { useFetchServiceSummary } from './use_fetch_service_summary';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const dataTestSubj = 'tracesServiceSummaryCell';
const palette = euiPaletteColorBlind({ rotations: 2 });
// Hover-intent delays: wait before opening so the popover doesn't flash while the pointer merely
// passes over the badge, and linger briefly on leave so the pointer can travel into the panel.
const HOVER_OPEN_DELAY = 500;
const HOVER_CLOSE_DELAY = 150;

const badgeStyle = css`
  max-width: 100%;
`;

interface ServiceSummaryBadgeProps {
  row: DataTableRecord;
  serviceNameField: string;
  toolkit: ContextAwarenessToolkit;
}

/**
 * Traces-profile service badge: hovering or focusing it opens the service summary popover
 * (clicking/tapping also opens it, for touch users); it closes on mouse-leave, blur, Escape, or
 * an outside click.
 *
 * Data (latency / throughput / error-rate series, active alerts, SLO health, and link targets) is
 * provided through the `discover_shared` features registry, which APM fulfils — Discover never
 * calls the APM internal routes or builds APM URLs directly. The service name in the header links
 * to APM; the alert and SLO rows open their respective APM pages in a new tab.
 *
 * Rendered both as the dedicated Service name column cell and (via `renderResourceBadge`) as the
 * service chip inside the traces summary column.
 */
export const ServiceSummaryBadge = ({
  row,
  serviceNameField,
  toolkit,
}: ServiceSummaryBadgeProps) => {
  const serviceNameValue = getFieldValue(row, serviceNameField);
  const agentName = getFieldValue(row, AGENT_NAME_FIELD) as AgentName;
  const otelSdkLanguage = getFieldValue(row, OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE) as
    | AgentName
    | undefined;
  const environmentValue = getFieldValue(row, SERVICE_ENVIRONMENT_FIELD);

  const [isPopoverOpen, { on: openPopover, off: closePopover }] = useBoolean(false);

  // Open/close the popover on hover with a short intent delay (see the delay constants above).
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(openPopover, HOVER_OPEN_DELAY);
  }, [openPopover]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(closePopover, HOVER_CLOSE_DELAY);
  }, [closePopover]);

  // Keyboard parity: focusing the badge opens immediately (no hover-intent delay), blurring away
  // closes it. `onFocus`/`onBlur` bubble, so this also covers focus moving within the panel.
  const handleFocus = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    openPopover();
  }, [openPopover]);

  const handleBlur = useCallback(() => {
    closeTimer.current = setTimeout(closePopover, HOVER_CLOSE_DELAY);
  }, [closePopover]);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

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
    ],
    [closePopover, linkTargets, activeAlertCount, slo]
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
      onClick={openPopover}
      onClickAriaLabel={i18n.translate('discover.tracesServiceSummary.openAriaLabel', {
        defaultMessage: 'Open summary for service {serviceName}',
        values: { serviceName },
      })}
      data-test-subj={`${dataTestSubj}-badge`}
    >
      <AgentIcon agentName={agentNameIcon} size="s" /> {serviceName}
    </EuiBadge>
  );

  return (
    // The span receives the hover/focus events; `panelProps` keeps the popover open while the
    // pointer is inside the panel so its filter/link actions stay reachable.
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <EuiPopover
        button={trigger}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        ownFocus={false}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        panelProps={{ onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }}
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
          serviceHref={linkTargets?.serviceOverview}
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
    </span>
  );
};

export const getServiceSummaryCell =
  (serviceNameField: string, toolkit: ContextAwarenessToolkit) =>
  (props: DataGridCellValueElementProps) =>
    <ServiceSummaryBadge row={props.row} serviceNameField={serviceNameField} toolkit={toolkit} />;

const activeAlertsLabel = i18n.translate('discover.tracesServiceSummary.activeAlerts', {
  defaultMessage: 'Active alerts',
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
      // Red to signal errors (palette[6] = #f6726a), rather than the next sequential vis color.
      color: palette[6],
      series: data?.failedTransactionRate.series ?? null,
    },
  ];
}
