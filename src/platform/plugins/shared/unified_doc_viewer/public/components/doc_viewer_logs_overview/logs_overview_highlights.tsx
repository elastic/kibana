/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { LogDocumentOverview } from '@kbn/discover-utils';
import { fieldConstants } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiBadge, EuiPanel } from '@elastic/eui';
import type { FieldConfiguration } from '../content_framework';
import { ContentFrameworkTable } from '../content_framework';
import { HighlightField } from '../observability/traces/components/highlight_field';
import { fieldLabels } from '../observability/constants';

interface LogsOverviewHighlightsProps
  extends Pick<
    DocViewRenderProps,
    'filter' | 'onAddColumn' | 'onRemoveColumn' | 'dataView' | 'hit'
  > {
  formattedDoc: LogDocumentOverview;
}

export function LogsOverviewHighlights({
  formattedDoc,
  hit,
  dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
}: LogsOverviewHighlightsProps) {
  const flattenedDoc = hit.flattened;
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
          hit={hit}
          dataView={dataView}
          id="logs-highlights"
          data-test-subj="unifiedDocViewLogsOverview"
        />
      </EuiPanel>
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
    title: fieldLabels.SERVICE_NAME_LABEL,
  },
  [fieldConstants.HOST_NAME_FIELD]: {
    title: fieldLabels.HOST_NAME_LABEL,
  },
  [fieldConstants.TRACE_ID_FIELD]: {
    title: fieldLabels.TRACE_ID_LABEL,
    formatter: (value: unknown, formattedValue: string) => (
      <HighlightField value={value as string} formattedValue={formattedValue} />
    ),
  },
  [fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: {
    title: fieldLabels.ORCHESTRATOR_CLUSTER_NAME_LABEL,
  },
  [fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]: {
    title: fieldLabels.ORCHESTRATOR_RESOURCE_ID_LABEL,
  },
  // Cloud
  [fieldConstants.CLOUD_PROVIDER_FIELD]: {
    title: fieldLabels.CLOUD_PROVIDER_LABEL,
  },
  [fieldConstants.CLOUD_REGION_FIELD]: {
    title: fieldLabels.CLOUD_REGION_LABEL,
  },
  [fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]: {
    title: fieldLabels.CLOUD_AVAILABILITY_ZONE_LABEL,
  },
  [fieldConstants.CLOUD_PROJECT_ID_FIELD]: {
    title: fieldLabels.CLOUD_PROJECT_ID_LABEL,
  },
  [fieldConstants.CLOUD_INSTANCE_ID_FIELD]: {
    title: fieldLabels.CLOUD_INSTANCE_ID_LABEL,
  },
  // Other
  [fieldConstants.LOG_FILE_PATH_FIELD]: {
    title: fieldLabels.LOG_FILE_PATH_LABEL,
  },
  [fieldConstants.DATASTREAM_DATASET_FIELD]: {
    title: fieldLabels.DATASTREAM_DATASET_LABEL,
  },
  [fieldConstants.DATASTREAM_NAMESPACE_FIELD]: {
    title: fieldLabels.DATASTREAM_NAMESPACE_LABEL,
    formatter: (value, formattedValue) => (
      <HighlightField value={value as string} formattedValue={formattedValue}>
        {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
      </HighlightField>
    ),
  },
  [fieldConstants.AGENT_NAME_FIELD]: {
    title: fieldLabels.AGENT_NAME_LABEL,
  },
};
