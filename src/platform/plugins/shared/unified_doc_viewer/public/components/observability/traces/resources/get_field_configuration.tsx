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

export interface FieldConfiguration<T> {
  title: string;
  content: (value: T | undefined) => React.ReactNode;
  value: T | undefined;
  fieldMetadata?: PartialFieldMetadataPlain;
}

export interface CommonFieldConfiguration {
  [TRANSACTION_NAME_FIELD]: FieldConfiguration<string>;
  [SERVICE_NAME_FIELD]: FieldConfiguration<string>;
  [TRACE_ID_FIELD]: FieldConfiguration<string>;
  [TIMESTAMP_FIELD]: FieldConfiguration<number>;
  [HTTP_RESPONSE_STATUS_CODE_FIELD]: FieldConfiguration<number>;
}

export const getCommonFieldConfiguration = (
  attributes: TraceDocumentOverview
): CommonFieldConfiguration => {
  return {
    [TRANSACTION_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      content: (value) =>
        value && (
          <TransactionNameLink
            serviceName={attributes[SERVICE_NAME_FIELD]}
            transactionName={value}
          />
        ),
      value: attributes[TRANSACTION_NAME_FIELD],
    },
    [SERVICE_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: (value) =>
        value && <ServiceNameLink serviceName={value} agentName={attributes[AGENT_NAME_FIELD]} />,
      value: attributes[SERVICE_NAME_FIELD],
    },
    [TRACE_ID_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: (value) => value && <TraceIdLink traceId={value} />,
      value: attributes[TRACE_ID_FIELD],
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: (value) => value && <Timestamp timestamp={value} />,
      value: attributes[TIMESTAMP_FIELD],
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: (value) => value && <HttpStatusCode code={value} />,
      value: attributes[HTTP_RESPONSE_STATUS_CODE_FIELD],
    },
  };
};
