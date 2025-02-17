/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SPAN_NAME_FIELD,
  TRANSACTION_NAME_FIELD,
  SERVICE_NAME_FIELD,
  TRACE_ID_FIELD,
  SPAN_DESTINATION_SERVICE_RESOURCE_FIELD,
  TIMESTAMP_FIELD,
  SPAN_DURATION_FIELD,
  TRANSACTION_DURATION_FIELD,
  HTTP_RESPONSE_STATUS_CODE_FIELD,
  SPAN_TYPE_FIELD,
  USER_AGENT_NAME_FIELD,
  TraceDocumentOverview,
  SPAN_SUBTYPE_FIELD,
  USER_AGENT_VERSION_FIELD,
  AGENT_NAME_FIELD,
  SERVICE_ENVIRONMENT_FIELD,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { ServiceNameLink } from '../sub_components/service_name_link';
import { TraceIdLink } from '../sub_components/trace_id_link';
import { TransactionNameLink } from '../sub_components/transaction_name_link';
import { Timestamp } from '../sub_components/timestamp';
import { DependencyNameLink } from '../sub_components/dependency_name_link';
import { HttpStatusCode } from '../sub_components/http_status_code';
import { asDuration } from '../utils';

type FieldConfigValue = string | number | undefined;

export interface FieldConfiguration {
  title: string;
  content: (value: FieldConfigValue) => React.ReactNode;
  value: FieldConfigValue;
  fieldMetadata?: PartialFieldMetadataPlain;
}

export const getFieldConfiguration = (
  attributes: TraceDocumentOverview
): Record<string, FieldConfiguration> => {
  return {
    [SPAN_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.spanName.title', {
        defaultMessage: 'Span name',
      }),
      content: (value) => <EuiText size="xs">{value}</EuiText>,
      value: attributes[SPAN_NAME_FIELD],
    },
    [TRANSACTION_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.transactionName.title', {
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
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: (value) => (
        <ServiceNameLink serviceName={value as string} agentName={attributes[AGENT_NAME_FIELD]} />
      ),
      value: attributes[SERVICE_NAME_FIELD],
    },
    [TRACE_ID_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: (value) => <TraceIdLink traceId={value as string} />,
      value: attributes[TRACE_ID_FIELD],
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.tracesOverview.details.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      content: (value) => (
        <DependencyNameLink
          dependencyName={value as string}
          environment={attributes[SERVICE_ENVIRONMENT_FIELD]}
        />
      ),
      value: attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD],
      fieldMetadata: {
        flat_name: 'span.destination.service.resource',
      },
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: (value) => <Timestamp timestamp={value as number} />,
      value: attributes[TIMESTAMP_FIELD],
    },
    [SPAN_DURATION_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.spanDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: (value) => <EuiText size="xs">{asDuration(value as number)}</EuiText>,
      value: attributes[SPAN_DURATION_FIELD] ?? 0,
    },
    [TRANSACTION_DURATION_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.transactionDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: (value) => <EuiText size="xs">{asDuration(value as number)}</EuiText>,
      value: attributes[TRANSACTION_DURATION_FIELD] ?? 0,
    },
    [SPAN_TYPE_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.spanType.title', {
        defaultMessage: 'Type',
      }),
      content: (value) => <EuiBadge color="hollow">{value}</EuiBadge>,
      value: attributes[SPAN_TYPE_FIELD],
    },
    [SPAN_SUBTYPE_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.spanSubtype.title', {
        defaultMessage: 'Subtype',
      }),
      content: (value) => <EuiBadge color="hollow">{value}</EuiBadge>,
      value: attributes[SPAN_SUBTYPE_FIELD],
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'unifiedDocViewer.tracesOverview.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: (value) => <HttpStatusCode code={value as number} />,
      value: attributes[HTTP_RESPONSE_STATUS_CODE_FIELD],
    },
    [USER_AGENT_NAME_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.userAgent.title', {
        defaultMessage: 'User agent',
      }),
      content: (value) => <EuiText size="xs">{value}</EuiText>,
      value: attributes[USER_AGENT_NAME_FIELD],
    },
    [USER_AGENT_VERSION_FIELD]: {
      title: i18n.translate('unifiedDocViewer.tracesOverview.details.userAgentVersion.title', {
        defaultMessage: 'User agent version',
      }),
      content: (value) => <EuiText size="xs">{value}</EuiText>,
      value: attributes[USER_AGENT_VERSION_FIELD],
    },
  };
};
