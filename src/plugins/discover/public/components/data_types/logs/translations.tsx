/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const flyoutContentLabel = i18n.translate('discover.logs.flyoutDetail.label.message', {
  defaultMessage: 'Content breakdown',
});

export const jsonLabel = i18n.translate('discover.logs.dataTable.header.popover.json', {
  defaultMessage: 'JSON',
});

export const contentLabel = i18n.translate('discover.logs.dataTable.header.popover.content', {
  defaultMessage: 'Content',
});

export const resourceLabel = i18n.translate('discover.logs.dataTable.header.popover.resource', {
  defaultMessage: 'Resource',
});

export const actionsLabel = i18n.translate('discover.logs.dataTable.header.popover.actions', {
  defaultMessage: 'Actions',
});

export const actionsLabelLowerCase = i18n.translate(
  'discover.logs.dataTable.header.popover.actions.lowercase',
  {
    defaultMessage: 'actions',
  }
);

export const flyoutServiceLabel = i18n.translate('discover.logs.flyoutDetail.label.service', {
  defaultMessage: 'Service',
});

export const flyoutTraceLabel = i18n.translate('discover.logs.flyoutDetail.label.trace', {
  defaultMessage: 'Trace',
});

export const flyoutHostNameLabel = i18n.translate('discover.logs.flyoutDetail.label.hostName', {
  defaultMessage: 'Host name',
});

export const serviceInfraAccordionTitle = i18n.translate(
  'discover.logs.flyoutDetail.accordion.title.serviceInfra',
  {
    defaultMessage: 'Service & Infrastructure',
  }
);

export const cloudAccordionTitle = i18n.translate(
  'discover.logs.flyoutDetail.accordion.title.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

export const otherAccordionTitle = i18n.translate(
  'discover.logs.flyoutDetail.accordion.title.other',
  {
    defaultMessage: 'Other',
  }
);

export const flyoutOrchestratorClusterNameLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

export const flyoutOrchestratorResourceIdLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

export const flyoutCloudProviderLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

export const flyoutCloudRegionLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.cloudRegion',
  {
    defaultMessage: 'Cloud region',
  }
);

export const flyoutCloudAvailabilityZoneLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

export const flyoutCloudProjectIdLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

export const flyoutCloudInstanceIdLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

export const flyoutLogPathFileLabel = i18n.translate(
  'discover.logs.flyoutDetail.label.logPathFile',
  {
    defaultMessage: 'Log path file',
  }
);

export const flyoutNamespaceLabel = i18n.translate('discover.logs.flyoutDetail.label.namespace', {
  defaultMessage: 'Namespace',
});

export const flyoutDatasetLabel = i18n.translate('discover.logs.flyoutDetail.label.dataset', {
  defaultMessage: 'Dataset',
});

export const flyoutShipperLabel = i18n.translate('discover.logs.flyoutDetail.label.shipper', {
  defaultMessage: 'Shipper',
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

export const flyoutHoverActionFilterForFieldPresentText = i18n.translate(
  'discover.logs.flyoutDetail.value.hover.filterForFieldPresent',
  {
    defaultMessage: 'Filter for field present',
  }
);

export const flyoutHoverActionToggleColumnText = i18n.translate(
  'discover.logs.flyoutDetail.value.hover.toggleColumn',
  {
    defaultMessage: 'Toggle column in table',
  }
);

export const flyoutHoverActionCopyToClipboardText = i18n.translate(
  'discover.logs.flyoutDetail.value.hover.copyToClipboard',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

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

export const flyoutAccordionShowMoreText = (count: number) =>
  i18n.translate('discover.logs.flyoutDetail.section.showMore', {
    defaultMessage: '+ {hiddenCount} more',
    values: {
      hiddenCount: count,
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

export const contentHeaderTooltipParagraph1 = (
  <FormattedMessage
    id="discover.logs.dataTable.header.content.tooltip.paragraph1"
    defaultMessage="Displays the document's {logLevel} and {message} fields."
    values={{
      logLevel: <strong>log.level</strong>,
      message: <strong>message</strong>,
    }}
  />
);

export const contentHeaderTooltipParagraph2 = i18n.translate(
  'discover.logs.dataTable.header.content.tooltip.paragraph2',
  {
    defaultMessage: 'When the message field is empty, one of the following is displayed:',
  }
);

export const resourceHeaderTooltipParagraph = i18n.translate(
  'discover.logs.dataTable.header.resource.tooltip.paragraph',
  {
    defaultMessage: "Fields that provide information on the document's source, such as:",
  }
);

export const actionsHeaderTooltipParagraph = i18n.translate(
  'discover.logs.dataTable.header.actions.tooltip.paragraph',
  {
    defaultMessage: 'Fields that provide actionable information, such as:',
  }
);

export const actionsHeaderTooltipExpandAction = i18n.translate(
  'discover.logs.dataTable.header.actions.tooltip.expand',
  { defaultMessage: 'Expand log details' }
);

export const actionsHeaderTooltipDegradedAction = (
  <FormattedMessage
    id="discover.logs.dataTable.controlColumn.actions.button.degradedDoc"
    defaultMessage="Access to degraded doc with {ignoredProperty} field"
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

export const actionsHeaderTooltipStacktraceAction = i18n.translate(
  'discover.logs.dataTable.header.actions.tooltip.stacktrace',
  { defaultMessage: 'Access to available stacktraces based on:' }
);

export const degradedDocButtonLabelWhenPresent = i18n.translate(
  'discover.logs.dataTable.controlColumn.actions.button.degradedDocPresent',
  {
    defaultMessage:
      "This document couldn't be parsed correctly. Not all fields are properly populated",
  }
);

export const degradedDocButtonLabelWhenNotPresent = i18n.translate(
  'discover.logs.dataTable.controlColumn.actions.button.degradedDocNotPresent',
  {
    defaultMessage: 'All fields in this document were parsed correctly',
  }
);

export const stacktraceAvailableControlButton = i18n.translate(
  'discover.logs.dataTable.controlColumn.actions.button.stacktrace.available',
  {
    defaultMessage: 'Stacktraces available',
  }
);

export const stacktraceNotAvailableControlButton = i18n.translate(
  'discover.logs.dataTable.controlColumn.actions.button.stacktrace.notAvailable',
  {
    defaultMessage: 'Stacktraces not available',
  }
);
