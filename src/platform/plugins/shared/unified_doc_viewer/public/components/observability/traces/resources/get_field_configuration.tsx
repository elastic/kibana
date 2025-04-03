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
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { ServiceNameLink } from '../components/service_name_link';
import { TraceIdLink } from '../components/trace_id_link';
import { Timestamp } from '../components/timestamp';
import { HttpStatusCode } from '../components/http_status_code';
import { TransactionNameLink } from '../components/transaction_name_link';

export type FieldConfigValue = string | number | undefined;

export interface FieldConfiguration {
  title: string;
  content: (value: FieldConfigValue) => React.ReactNode;
  value: FieldConfigValue;
  fieldMetadata?: PartialFieldMetadataPlain;
}

export const getCommonFieldConfiguration = (
  attributes: TraceDocumentOverview
): Record<string, FieldConfiguration> => {
  return {
    [TRANSACTION_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      content: (value) => (
        <TransactionNameLink
          serviceName={attributes[SERVICE_NAME_FIELD]}
          transactionName={value as string}
        />
      ),
      value: attributes[TRANSACTION_NAME_FIELD],
    },
    [SERVICE_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: (value) => (
        <ServiceNameLink serviceName={value as string} agentName={attributes[AGENT_NAME_FIELD]} />
      ),
      value: attributes[SERVICE_NAME_FIELD],
    },
    [TRACE_ID_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: (value) => <TraceIdLink traceId={value as string} />,
      value: attributes[TRACE_ID_FIELD],
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: (value) => <Timestamp timestamp={value as number} />,
      value: attributes[TIMESTAMP_FIELD],
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: (value) => <HttpStatusCode code={value as number} />,
      value: attributes[HTTP_RESPONSE_STATUS_CODE_FIELD],
    },
  };
};
