/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SERVICE_NAME_FIELD,
  TRACE_ID_FIELD,
  TIMESTAMP_FIELD,
  HTTP_RESPONSE_STATUS_CODE_FIELD,
  TraceDocumentOverview,
  AGENT_NAME_FIELD,
  TRANSACTION_NAME_FIELD,
  type DataTableRecord,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { ServiceNameLink } from '../components/service_name_link';
import { TraceIdLink } from '../components/trace_id_link';
import { Timestamp } from '../components/timestamp';
import { HttpStatusCode } from '../components/http_status_code';
import { TransactionNameLink } from '../components/transaction_name_link';
import { getTraceDocValue } from './get_field_value';
import { HighlightField } from '../components/highlight_field.tsx';

export type FieldConfigValue = string | number | undefined;

export interface FieldConfiguration {
  title: string;
  content: (value: FieldConfigValue, formattedValue?: string) => React.ReactNode;
  value: FieldConfigValue;
  fieldMetadata?: PartialFieldMetadataPlain;
  formattedValue?: string;
}

export const getCommonFieldConfiguration = ({
  attributes,
  flattenedDoc,
}: {
  attributes: TraceDocumentOverview;
  flattenedDoc: DataTableRecord['flattened'];
}): Record<string, FieldConfiguration> => {
  return {
    [TRANSACTION_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue}>
          {({ content }) => (
            <TransactionNameLink
              serviceName={attributes[SERVICE_NAME_FIELD]}
              transactionName={value as string}
              renderContent={() => content}
            />
          )}
        </HighlightField>
      ),
      value: getTraceDocValue(TRANSACTION_NAME_FIELD, flattenedDoc),
      formattedValue: attributes[TRANSACTION_NAME_FIELD],
    },
    [SERVICE_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue}>
          {({ content }) => (
            <ServiceNameLink
              serviceName={value as string}
              agentName={getTraceDocValue(AGENT_NAME_FIELD, flattenedDoc)}
              formattedServiceName={content}
            />
          )}
        </HighlightField>
      ),
      value: getTraceDocValue(SERVICE_NAME_FIELD, flattenedDoc),
      formattedValue: attributes[SERVICE_NAME_FIELD],
    },
    [TRACE_ID_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: (value, formattedValue) => (
        <HighlightField value={value} formattedValue={formattedValue}>
          {({ content }) => <TraceIdLink traceId={value as string} formattedTraceId={content} />}
        </HighlightField>
      ),
      value: getTraceDocValue(TRACE_ID_FIELD, flattenedDoc),
      formattedValue: attributes[TRACE_ID_FIELD],
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: (value) => <Timestamp timestamp={value as number} />,
      value: getTraceDocValue(TIMESTAMP_FIELD, flattenedDoc),
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: (value) => <HttpStatusCode code={value as number} />,
      value: getTraceDocValue(HTTP_RESPONSE_STATUS_CODE_FIELD, flattenedDoc),
    },
  };
};
