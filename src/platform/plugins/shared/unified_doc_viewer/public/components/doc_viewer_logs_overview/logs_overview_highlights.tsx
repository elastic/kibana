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
import { TraceIdLink } from '../observability/traces/components/trace_id_link';
import { fieldLabels } from '../observability/constants';

interface LogsOverviewHighlightsProps
  extends Pick<
    DocViewRenderProps,
    'filter' | 'onAddColumn' | 'onRemoveColumn' | 'dataView' | 'hit'
  > {
  formattedDoc: LogDocumentOverview;
}

/**
 * Helper to flatten nested objects into dot-notation keys
 */
function flattenObject(obj: Record<string, unknown>, prefix: string = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Checks if a field exists either in flattened doc or in _source with attributes.* or resource.attributes.* prefix
 */
function hasFieldValue(
  field: string,
  flattenedDoc: Record<string, unknown>,
  flattenedSource: Record<string, unknown>
): boolean {
  // Check mapped field first
  const hasMapped = Boolean(flattenedDoc[field]);
  
  // Check _source for unmapped attributes.* or resource.attributes.* fields
  const attributesField = `attributes.${field}`;
  const resourceAttributesField = `resource.attributes.${field}`;
  
  const hasAttributes = Boolean(flattenedSource[attributesField]);
  const hasResourceAttributes = Boolean(flattenedSource[resourceAttributesField]);
  
  console.log(`[hasFieldValue] "${field}": mapped=${hasMapped}, attributes=${hasAttributes}, resource.attributes=${hasResourceAttributes}`);
  
  return hasMapped || hasAttributes || hasResourceAttributes;
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
  const flattenedSource = hit.raw._source ? flattenObject(hit.raw._source) : {};
  
  console.log('[LogsOverviewHighlights] DEBUG - flattenedDoc:', flattenedDoc);
  console.log('[LogsOverviewHighlights] DEBUG - flattenedSource:', flattenedSource);
  console.log('[LogsOverviewHighlights] DEBUG - formattedDoc:', formattedDoc);
  console.log('[LogsOverviewHighlights] DEBUG - fieldNames:', fieldNames);
  
  const shouldRenderSection = (fields: Array<keyof LogDocumentOverview>) => {
    return fields.some((field) => {
      // Field is available if it has a value either in formattedDoc OR in _source
      const hasValue = hasFieldValue(field, flattenedDoc, flattenedSource);
      console.log(`[LogsOverviewHighlights] Field "${field}": hasValue=${hasValue}`);
      return hasValue;
    });
  };

  if (!shouldRenderSection(fieldNames)) {
    console.log('[LogsOverviewHighlights] No fields to render, returning null');
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
  fieldConstants.KUBERNETES_NAMESPACE_FIELD,
  fieldConstants.KUBERNETES_POD_NAME_FIELD,
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
    title: fieldLabels.ORCHESTRATOR_CLUSTER_NAME_LABEL,
  },
  [fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]: {
    title: fieldLabels.ORCHESTRATOR_RESOURCE_ID_LABEL,
  },
  [fieldConstants.KUBERNETES_NAMESPACE_FIELD]: {
    title: fieldLabels.KUBERNETES_NAMESPACE_LABEL,
  },
  [fieldConstants.KUBERNETES_POD_NAME_FIELD]: {
    title: fieldLabels.KUBERNETES_POD_NAME_LABEL,
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
