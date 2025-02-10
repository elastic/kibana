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
import { ServiceNameLink } from '../sub_components/service_name_link';
import { TraceIdLink } from '../sub_components/trace_id_link';
import { TransactionNameLink } from '../sub_components/transaction_name_link';
import { Timestamp } from '../sub_components/timestamp';
import { Duration } from '../sub_components/duration';
import { DependencyNameLink } from '../sub_components/dependency_name_link';
import { HttpStatusCode } from '../sub_components/http_status_code';

export const getFieldConfiguration = (
  attributes: TraceDocumentOverview
): Record<string, { title: string; content: React.ReactNode; value: any }> => {
  return {
    [SPAN_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanName.title', {
        defaultMessage: 'Span name',
      }),
      content: <EuiText size="xs">{attributes[SPAN_NAME_FIELD]}</EuiText>,
      value: attributes[SPAN_NAME_FIELD],
    },
    [TRANSACTION_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      content: (
        <TransactionNameLink
          serviceName={attributes[SERVICE_NAME_FIELD]}
          transactionName={attributes[TRANSACTION_NAME_FIELD]}
        />
      ),
      value: attributes[TRANSACTION_NAME_FIELD],
    },
    [SERVICE_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: (
        <ServiceNameLink
          serviceName={attributes[SERVICE_NAME_FIELD]}
          agentName={attributes[AGENT_NAME_FIELD]}
        />
      ),
      value: attributes[SERVICE_NAME_FIELD],
    },
    [TRACE_ID_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: <TraceIdLink traceId={attributes[TRACE_ID_FIELD]} />,
      value: attributes[TRACE_ID_FIELD],
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: {
      title: i18n.translate(
        'discover.docViews.tracesOverview.details.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      content: attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD] ? (
        <DependencyNameLink
          dependencyName={attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]}
          environment={attributes[SERVICE_ENVIRONMENT_FIELD]}
        />
      ) : null,
      value: attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD],
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: <Timestamp timestamp={attributes[TIMESTAMP_FIELD]} />,
      value: attributes[TIMESTAMP_FIELD],
    },
    [SPAN_DURATION_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: <Duration duration={attributes[SPAN_DURATION_FIELD] ?? 0} />,
      value: attributes[SPAN_DURATION_FIELD] ?? 0,
    },
    [TRANSACTION_DURATION_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.transactionDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: <Duration duration={attributes[TRANSACTION_DURATION_FIELD] ?? 0} />,
      value: attributes[TRANSACTION_DURATION_FIELD] ?? 0,
    },
    [SPAN_TYPE_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanType.title', {
        defaultMessage: 'Type',
      }),
      content: attributes[SPAN_TYPE_FIELD] ? (
        <div>
          <EuiBadge color="hollow">{attributes[SPAN_TYPE_FIELD]}</EuiBadge>
        </div>
      ) : null,
      value: attributes[SPAN_TYPE_FIELD],
    },
    [SPAN_SUBTYPE_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanSubtype.title', {
        defaultMessage: 'Subtype',
      }),
      content: attributes[SPAN_SUBTYPE_FIELD] ? (
        <div>
          <EuiBadge color="hollow">{attributes[SPAN_SUBTYPE_FIELD]}</EuiBadge>
        </div>
      ) : null,
      value: attributes[SPAN_SUBTYPE_FIELD],
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'discover.docViews.tracesOverview.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: attributes[HTTP_RESPONSE_STATUS_CODE_FIELD] ? (
        <HttpStatusCode code={attributes[HTTP_RESPONSE_STATUS_CODE_FIELD]} />
      ) : null,
      value: attributes[HTTP_RESPONSE_STATUS_CODE_FIELD],
    },
    [USER_AGENT_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.userAgent.title', {
        defaultMessage: 'User agent',
      }),
      content: attributes[USER_AGENT_NAME_FIELD] ? (
        <EuiText size="xs">{attributes[USER_AGENT_NAME_FIELD]}</EuiText>
      ) : null,
      value: attributes[USER_AGENT_NAME_FIELD],
    },
    [USER_AGENT_VERSION_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.userAgentVersion.title', {
        defaultMessage: 'User agent version',
      }),
      content: attributes[USER_AGENT_VERSION_FIELD] ? (
        <EuiText size="xs">{attributes[USER_AGENT_VERSION_FIELD]}</EuiText>
      ) : null,
      value: attributes[USER_AGENT_VERSION_FIELD],
    },
  };
};
