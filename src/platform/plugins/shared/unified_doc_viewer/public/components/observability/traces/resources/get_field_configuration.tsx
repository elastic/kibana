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
  AGENT_NAME_FIELD,
  TRANSACTION_NAME_FIELD,
  SpanDocumentOverview,
  TransactionDocumentOverview,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { Timestamp, HttpStatusCode } from '@kbn/apm-ui-shared';
import { ServiceNameLink } from '../components/service_name_link';
import { TraceIdLink } from '../components/trace_id_link';
import { TransactionNameLink } from '../components/transaction_name_link';
import { HighlightField } from '../components/highlight_field';

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
  attributes: TransactionDocumentOverview | SpanDocumentOverview;
  flattenedDoc: TransactionDocumentOverview | SpanDocumentOverview;
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
              serviceName={flattenedDoc[SERVICE_NAME_FIELD]}
              transactionName={value as string}
              renderContent={() => content}
            />
          )}
        </HighlightField>
      ),
      value: flattenedDoc[TRANSACTION_NAME_FIELD],
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
              agentName={flattenedDoc[AGENT_NAME_FIELD]}
              formattedServiceName={content}
            />
          )}
        </HighlightField>
      ),
      value: flattenedDoc[SERVICE_NAME_FIELD],
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
      value: flattenedDoc[TRACE_ID_FIELD],
      formattedValue: attributes[TRACE_ID_FIELD],
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: (value) => <Timestamp timestamp={value as number} size="xs" />,
      value: flattenedDoc[TIMESTAMP_FIELD],
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: (value) => <HttpStatusCode code={value as number} />,
      value: flattenedDoc[HTTP_RESPONSE_STATUS_CODE_FIELD],
    },
  };
};
