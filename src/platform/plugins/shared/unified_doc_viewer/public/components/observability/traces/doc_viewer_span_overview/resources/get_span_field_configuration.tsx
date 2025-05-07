/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge } from '@elastic/eui';
import {
  DataTableRecord,
  SERVICE_ENVIRONMENT_FIELD,
  SPAN_DESTINATION_SERVICE_RESOURCE_FIELD,
  SPAN_NAME_FIELD,
  SPAN_SUBTYPE_FIELD,
  SPAN_TYPE_FIELD,
  TraceDocumentOverview,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HighlightField } from '../../components/highlight_field.tsx';
import {
  FieldConfiguration,
  getCommonFieldConfiguration,
} from '../../resources/get_field_configuration';
import { getTraceDocValue } from '../../resources/get_field_value';
import { DependencyNameLink } from '../sub_components/dependency_name_link';

export const getSpanFieldConfiguration = ({
  attributes,
  flattenedDoc,
}: {
  attributes: TraceDocumentOverview;
  flattenedDoc: DataTableRecord['flattened'];
}): Record<string, FieldConfiguration> => {
  return {
    ...getCommonFieldConfiguration({ attributes, flattenedDoc }),
    [SPAN_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.spanName.title', {
        defaultMessage: 'Span name',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue} />
      ),
      value: getTraceDocValue(SPAN_NAME_FIELD, flattenedDoc),
      formattedValue: attributes[SPAN_NAME_FIELD],
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue}>
          {({ content }) => (
            <DependencyNameLink
              dependencyName={value as string}
              environment={getTraceDocValue(SERVICE_ENVIRONMENT_FIELD, flattenedDoc)}
              formattedDependencyName={content}
            />
          )}
        </HighlightField>
      ),
      value: getTraceDocValue(SPAN_DESTINATION_SERVICE_RESOURCE_FIELD, flattenedDoc),
      formattedValue: attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD],
      fieldMetadata: {
        flat_name: 'span.destination.service.resource',
      },
    },
    [SPAN_TYPE_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.spanType.title', {
        defaultMessage: 'Type',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue}>
          {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
        </HighlightField>
      ),
      value: getTraceDocValue(SPAN_TYPE_FIELD, flattenedDoc),
      formattedValue: attributes[SPAN_TYPE_FIELD],
    },
    [SPAN_SUBTYPE_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.spanSubtype.title', {
        defaultMessage: 'Subtype',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue}>
          {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
        </HighlightField>
      ),
      value: getTraceDocValue(SPAN_SUBTYPE_FIELD, flattenedDoc),
      formattedValue: attributes[SPAN_SUBTYPE_FIELD],
    },
  };
};
