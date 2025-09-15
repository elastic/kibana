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
import type { DataTableRecord, LogDocumentOverview } from '@kbn/discover-utils';
import { fieldConstants } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiBadge, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { FieldConfiguration } from '../content_framework';
import { ContentFrameworkTable } from '../content_framework';
import { HighlightField } from '../observability/traces/components/highlight_field';
import { TraceIdLink } from '../observability/traces/components/trace_id_link';

interface LogsOverviewHighlightsProps
  extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn'> {
  formattedDoc: LogDocumentOverview;
  doc: DataTableRecord;
  dataView: DataView;
}

export function LogsOverviewHighlights({
  formattedDoc,
  doc,
  dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
}: LogsOverviewHighlightsProps) {
  const flattenedDoc = doc.flattened;
  const shouldRenderSection = (fields: Array<keyof LogDocumentOverview>) => {
    return fields.some((field) => Boolean(formattedDoc[field] && flattenedDoc[field]));
  };

  const fieldNames: Array<keyof LogDocumentOverview> = [
    // Service & Infrastructure
    fieldConstants.SERVICE_NAME_FIELD,
    fieldConstants.HOST_NAME_FIELD,
    fieldConstants.TRACE_ID_FIELD,
    fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD,
    fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD,
    // Cloud
    fieldConstants.CLOUD_PROVIDER_FIELD,
    fieldConstants.CLOUD_REGION_FIELD,
    fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD,
    fieldConstants.CLOUD_PROJECT_ID_FIELD,
    fieldConstants.CLOUD_INSTANCE_ID_FIELD,
    // Other
    fieldConstants.LOG_FILE_PATH_FIELD,
    fieldConstants.DATASTREAM_DATASET_FIELD,
    fieldConstants.DATASTREAM_NAMESPACE_FIELD,
    fieldConstants.AGENT_NAME_FIELD,
  ];

  const fieldConfigurations: Record<string, FieldConfiguration> = {
    // Service & Infrastructure
    [fieldConstants.SERVICE_NAME_FIELD]: {
      title: serviceLabel,
    },
    [fieldConstants.HOST_NAME_FIELD]: { title: hostNameLabel },
    [fieldConstants.TRACE_ID_FIELD]: {
      title: traceLabel,
      formatter: (value: unknown, formattedValue: string) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => (
            <TraceIdLink
              traceId={value as string}
              formattedTraceId={content}
              data-test-subj="unifiedDocViewLogsOverviewTraceIdHighlightLink"
            />
          )}
        </HighlightField>
      ),
    },
    [fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: { title: orchestratorClusterNameLabel },
    [fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]: { title: orchestratorResourceIdLabel },
    // Cloud
    [fieldConstants.CLOUD_PROVIDER_FIELD]: { title: cloudProviderLabel },
    [fieldConstants.CLOUD_REGION_FIELD]: { title: cloudRegionLabel },
    [fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]: { title: cloudAvailabilityZoneLabel },
    [fieldConstants.CLOUD_PROJECT_ID_FIELD]: { title: cloudProjectIdLabel },
    [fieldConstants.CLOUD_INSTANCE_ID_FIELD]: { title: cloudInstanceIdLabel },
    // Other
    [fieldConstants.LOG_FILE_PATH_FIELD]: { title: logPathFileLabel },
    [fieldConstants.DATASTREAM_DATASET_FIELD]: { title: datasetLabel },
    [fieldConstants.DATASTREAM_NAMESPACE_FIELD]: {
      title: namespaceLabel,
      formatter: (value, formattedValue) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
        </HighlightField>
      ),
    },
    [fieldConstants.AGENT_NAME_FIELD]: { title: shipperLabel },
  };

  if (!shouldRenderSection(fieldNames)) {
    return null;
  }

  return (
    <>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="s">
        <ContentFrameworkTable
          fieldNames={fieldNames}
          fieldConfigurations={fieldConfigurations}
          filter={filter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          hit={doc}
          dataView={dataView}
          id="logs-highlights"
          data-test-subj="unifiedDocViewLogsOverview"
        />
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
}

const serviceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.service', {
  defaultMessage: 'Service',
});

const traceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.trace', {
  defaultMessage: 'Trace',
});

const hostNameLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.hostName', {
  defaultMessage: 'Host name',
});

const orchestratorClusterNameLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

const orchestratorResourceIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

const cloudProviderLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

const cloudRegionLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudRegion', {
  defaultMessage: 'Cloud region',
});

const cloudAvailabilityZoneLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

const cloudProjectIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

const cloudInstanceIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

const logPathFileLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.logPathFile', {
  defaultMessage: 'Log path file',
});

const namespaceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.namespace', {
  defaultMessage: 'Namespace',
});

const datasetLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.dataset', {
  defaultMessage: 'Dataset',
});

const shipperLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.shipper', {
  defaultMessage: 'Shipper',
});
