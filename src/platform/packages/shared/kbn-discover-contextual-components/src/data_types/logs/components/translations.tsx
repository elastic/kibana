/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const jsonLabel = i18n.translate('discover.logs.dataTable.header.popover.json', {
  defaultMessage: 'JSON',
});

export const contentLabel = i18n.translate('discover.logs.dataTable.header.popover.content', {
  defaultMessage: 'Content',
});

export const resourceLabel = i18n.translate('discover.logs.dataTable.header.popover.resource', {
  defaultMessage: 'Resource',
});

export const traceLabel = i18n.translate('discover.traces.dataTable.header.popover.trace', {
  defaultMessage: 'Trace',
});

export const actionFilterForText = (text: string) =>
  i18n.translate('discover.logs.flyoutDetail.value.hover.filterFor', {
    defaultMessage: 'Filter for this {value}',
    values: {
      value: text,
    },
  });

export const actionFilterOutText = (text: string) =>
  i18n.translate('discover.logs.flyoutDetail.value.hover.filterOut', {
    defaultMessage: 'Filter out this {value}',
    values: {
      value: text,
    },
  });

export const filterOutText = i18n.translate('discover.logs.popoverAction.filterOut', {
  defaultMessage: 'Filter out',
});

export const filterForText = i18n.translate('discover.logs.popoverAction.filterFor', {
  defaultMessage: 'Filter for',
});

export const copyValueText = i18n.translate('discover.logs.popoverAction.copyValue', {
  defaultMessage: 'Copy value',
});

export const copyValueAriaText = (fieldName: string) =>
  i18n.translate('discover.logs.popoverAction.copyValueAriaText', {
    defaultMessage: 'Copy value of {fieldName}',
    values: {
      fieldName,
    },
  });

export const openCellActionPopoverAriaText = i18n.translate(
  'discover.logs.popoverAction.openPopover',
  {
    defaultMessage: 'Open popover',
  }
);

export const closeCellActionPopoverText = i18n.translate(
  'discover.logs.popoverAction.closePopover',
  {
    defaultMessage: 'Close popover',
  }
);

export const contextualBadgePopoverServiceTitle = i18n.translate(
  'discover.logs.contextualBadgePopover.serviceTitle',
  {
    defaultMessage: 'Service',
  }
);

export const contextualBadgePopoverHostTitle = i18n.translate(
  'discover.logs.contextualBadgePopover.hostTitle',
  {
    defaultMessage: 'Host',
  }
);

export const contextualBadgePopoverContainerTitle = i18n.translate(
  'discover.logs.contextualBadgePopover.containerTitle',
  {
    defaultMessage: 'Container',
  }
);

export const contextualBadgePopoverClusterTitle = i18n.translate(
  'discover.logs.contextualBadgePopover.clusterTitle',
  {
    defaultMessage: 'Cluster',
  }
);

export const contextualBadgePopoverTraceTitle = i18n.translate(
  'discover.logs.contextualBadgePopover.traceTitle',
  {
    defaultMessage: 'Trace',
  }
);

export const contextualBadgePopoverFieldTitle = i18n.translate(
  'discover.logs.contextualBadgePopover.fieldTitle',
  {
    defaultMessage: 'Field',
  }
);

export const contextualBadgePopoverLatencyP95Label = i18n.translate(
  'discover.logs.contextualBadgePopover.latencyP95Label',
  {
    defaultMessage: 'Latency p95',
  }
);

export const contextualBadgePopoverCpuUsageLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.cpuUsageLabel',
  {
    defaultMessage: 'CPU usage',
  }
);

export const contextualBadgePopoverMemoryUsageLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.memoryUsageLabel',
  {
    defaultMessage: 'Memory',
  }
);

export const contextualBadgePopoverPodsReadyLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.podsReadyLabel',
  {
    defaultMessage: 'Pods ready',
  }
);

export const contextualBadgePopoverDurationLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.durationLabel',
  {
    defaultMessage: 'Duration',
  }
);

export const contextualBadgePopoverThroughputLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.throughputLabel',
  {
    defaultMessage: 'Throughput',
  }
);

export const contextualBadgePopoverFailureRateLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.failureRateLabel',
  {
    defaultMessage: 'Failure rate',
  }
);

export const contextualBadgePopoverLogRateLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.logRateLabel',
  {
    defaultMessage: 'Log rate',
  }
);

export const contextualBadgePopoverOpenOverviewButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.openOverviewButtonLabel',
  {
    defaultMessage: 'Open overview',
  }
);

export const contextualBadgePopoverOpenInServiceMapButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.openInServiceMapButtonLabel',
  {
    defaultMessage: 'Open in service map',
  }
);

export const contextualBadgePopoverErrorsFoundButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.errorsFoundButtonLabel',
  {
    defaultMessage: 'Errors found',
  }
);

export const contextualBadgePopoverRelatedLogsButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.relatedLogsButtonLabel',
  {
    defaultMessage: 'Related logs',
  }
);

export const contextualBadgePopoverNodeHealthButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.nodeHealthButtonLabel',
  {
    defaultMessage: 'Node health',
  }
);

export const contextualBadgePopoverActiveAlertsButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.activeAlertsButtonLabel',
  {
    defaultMessage: 'Active alerts',
  }
);

export const contextualBadgePopoverInfrastructureMetricsButtonLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.infrastructureMetricsButtonLabel',
  {
    defaultMessage: 'Infrastructure metrics',
  }
);

export const contextualBadgePopoverOpenInNewTabAriaLabel = i18n.translate(
  'discover.logs.contextualBadgePopover.openInNewTabAriaLabel',
  {
    defaultMessage: 'Open in a new tab',
  }
);
