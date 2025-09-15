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
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.service', {
      defaultMessage: 'Service',
    }),
  },
  [fieldConstants.HOST_NAME_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.hostName', {
      defaultMessage: 'Host name',
    }),
  },
  [fieldConstants.TRACE_ID_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.trace', {
      defaultMessage: 'Trace',
    }),
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
  [fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.orchestratorClusterName', {
      defaultMessage: 'Orchestrator cluster Name',
    }),
  },
  [fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.orchestratorResourceId', {
      defaultMessage: 'Orchestrator resource ID',
    }),
  },
  // Cloud
  [fieldConstants.CLOUD_PROVIDER_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudProvider', {
      defaultMessage: 'Cloud provider',
    }),
  },
  [fieldConstants.CLOUD_REGION_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudRegion', {
      defaultMessage: 'Cloud region',
    }),
  },
  [fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudAvailabilityZone', {
      defaultMessage: 'Cloud availability zone',
    }),
  },
  [fieldConstants.CLOUD_PROJECT_ID_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudProjectId', {
      defaultMessage: 'Cloud project ID',
    }),
  },
  [fieldConstants.CLOUD_INSTANCE_ID_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudInstanceId', {
      defaultMessage: 'Cloud instance ID',
    }),
  },
  // Other
  [fieldConstants.LOG_FILE_PATH_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.logPathFile', {
      defaultMessage: 'Log path file',
    }),
  },
  [fieldConstants.DATASTREAM_DATASET_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.dataset', {
      defaultMessage: 'Dataset',
    }),
  },
  [fieldConstants.DATASTREAM_NAMESPACE_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.namespace', {
      defaultMessage: 'Namespace',
    }),
    formatter: (value, formattedValue) => (
      <HighlightField value={value as string} formattedValue={formattedValue}>
        {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
      </HighlightField>
    ),
  },
  [fieldConstants.AGENT_NAME_FIELD]: {
    title: i18n.translate('unifiedDocViewer.docView.logsOverview.label.shipper', {
      defaultMessage: 'Shipper',
    }),
  },
};
