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
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { castArray } from 'lodash';
import { ServiceNameLink } from '../sub_components/service_name_link';
import { TraceIdLink } from '../sub_components/trace_id_link';

export const getAttributeConfiguration = (
  attributes: TraceDocumentOverview
): Record<string, { title: string; content: React.ReactNode }> => {
  return {
    [SPAN_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanName.title', {
        defaultMessage: 'Span name',
      }),
      content: <p>{attributes[SPAN_NAME_FIELD]}</p>,
    },
    [TRANSACTION_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      content: <p>{attributes[TRANSACTION_NAME_FIELD]}</p>,
    },
    [SERVICE_NAME_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: (
        <ServiceNameLink
          serviceName={attributes[SERVICE_NAME_FIELD]}
          agentName={castArray(attributes[AGENT_NAME_FIELD])[0]}
        />
      ),
    },
    [TRACE_ID_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: <TraceIdLink traceId={attributes[TRACE_ID_FIELD]} />,
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: {
      title: i18n.translate(
        'discover.docViews.tracesOverview.details.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      content: <p>{attributes[SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]}</p>,
    },
    [TIMESTAMP_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: <p>{attributes[TIMESTAMP_FIELD]}</p>,
    },
    [SPAN_DURATION_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: <p>{attributes[SPAN_DURATION_FIELD]}</p>,
    },
    [TRANSACTION_DURATION_FIELD]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.transactionDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: <p>{attributes[TRANSACTION_DURATION_FIELD]}</p>,
    },
    ['type_and_subtype']: {
      title: i18n.translate('discover.docViews.tracesOverview.details.typeAndSubtype.title', {
        defaultMessage: 'Type & Subtype',
      }),
      content: (
        <p>
          {attributes[SPAN_TYPE_FIELD]} - {attributes[SPAN_SUBTYPE_FIELD]}
        </p>
      ),
    },
    [HTTP_RESPONSE_STATUS_CODE_FIELD]: {
      title: i18n.translate(
        'discover.docViews.tracesOverview.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: <p>{attributes[HTTP_RESPONSE_STATUS_CODE_FIELD]}</p>,
    },
    ['user_agent_and_version']: {
      title: i18n.translate('discover.docViews.tracesOverview.details.userAgentAndVersion.title', {
        defaultMessage: 'User agent & Version',
      }),
      content: (
        <p>
          {attributes[USER_AGENT_NAME_FIELD]} - {attributes[USER_AGENT_VERSION_FIELD]}
        </p>
      ),
    },
  };
};
