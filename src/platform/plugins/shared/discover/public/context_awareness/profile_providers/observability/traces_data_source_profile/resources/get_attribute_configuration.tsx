/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SPAN_NAME,
  TRANSACTION_NAME,
  SERVICE,
  TRACE_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TIMESTAMP_US,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  HTTP_RESPONSE_STATUS_CODE,
  USER_AGENT_NAME,
} from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const getAttributeConfiguration = (
  params
): Record<string, { title: string; content: React.ReactNode }> => {
  return {
    [SPAN_NAME]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanName.title', {
        defaultMessage: 'Span name',
      }),
      content: <p>{params.record.flattened[SPAN_NAME]}</p>,
    },
    [TRANSACTION_NAME]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      content: <p>{params.record.flattened[TRANSACTION_NAME]}</p>,
    },
    [SERVICE]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.service.title', {
        defaultMessage: 'Service',
      }),
      content: <p>{params.record.flattened['service.name']}</p>,
    },
    [TRACE_ID]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      content: <p>{params.record.flattened[TRACE_ID]}</p>,
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE]: {
      title: i18n.translate(
        'discover.docViews.tracesOverview.details.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      content: <p>{params.record.flattened[SPAN_DESTINATION_SERVICE_RESOURCE]}</p>,
    },
    [TIMESTAMP_US]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      content: <p>{params.record.flattened[TIMESTAMP_US]}</p>,
    },
    [SPAN_DURATION]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.spanDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: <p>{params.record.flattened[SPAN_DURATION]}</p>,
    },
    [TRANSACTION_DURATION]: {
      title: i18n.translate('discover.docViews.tracesOverview.details.transactionDuration.title', {
        defaultMessage: 'Duration',
      }),
      content: <p>{params.record.flattened[TRANSACTION_DURATION]}</p>,
    },
    ['type_and_subtype']: {
      title: i18n.translate('discover.docViews.tracesOverview.details.typeAndSubtype.title', {
        defaultMessage: 'Type & Subtype',
      }),
      content: (
        <p>
          {params.record.flattened[SPAN_TYPE]} - {params.record.flattened[SPAN_SUBTYPE]}
        </p>
      ),
    },
    [HTTP_RESPONSE_STATUS_CODE]: {
      title: i18n.translate(
        'discover.docViews.tracesOverview.details.httpResponseStatusCode.title',
        {
          defaultMessage: 'Status code',
        }
      ),
      content: <p>{params.record.flattened[HTTP_RESPONSE_STATUS_CODE]}</p>,
    },
    ['user_agent_and_version']: {
      title: i18n.translate('discover.docViews.tracesOverview.details.userAgentAndVersion.title', {
        defaultMessage: 'User agent & Version',
      }),
      content: (
        <p>
          {params.record.flattened[USER_AGENT_NAME]} -
          {params.record.flattened['user_agent.version']}
        </p>
      ),
    },
  };
};
