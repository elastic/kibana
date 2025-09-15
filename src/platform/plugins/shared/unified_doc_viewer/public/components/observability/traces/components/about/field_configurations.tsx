/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

import {
  AGENT_NAME,
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { HttpStatusCode, Timestamp } from '@kbn/apm-ui-shared';
import { EuiBadge } from '@elastic/eui';
import type { TraceDocumentOverview } from '@kbn/discover-utils';
import type { ContentFrameworkTableProps } from '../../../../content_framework';
import { ServiceNameLink } from '../service_name_link';
import { TransactionNameLink } from '../transaction_name_link';
import { HighlightField } from '../highlight_field';
import { DependencyNameLink } from '../dependency_name_link';
import { TraceIdLink } from '../trace_id_link';

export const getSharedFieldConfigurations = (
  flattenedHit: TraceDocumentOverview
): ContentFrameworkTableProps['fieldConfigurations'] => {
  return {
    [SERVICE_NAME]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.serviceName.title', {
        defaultMessage: 'Service Name',
      }),
      formatter: (value: unknown, formattedValue: string) => (
        <>
          <HighlightField value={value as string} formattedValue={formattedValue}>
            {({ content }) => (
              <ServiceNameLink
                serviceName={value as string}
                agentName={flattenedHit[AGENT_NAME] ?? ''}
                formattedServiceName={content}
                data-test-subj="unifiedDocViewerObservabilityTracesServiceNameLink"
              />
            )}
          </HighlightField>
        </>
      ),
    },
    [AT_TIMESTAMP]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.timestamp.title', {
        defaultMessage: 'Start time',
      }),
      formatter: (value: unknown) => <Timestamp timestamp={value as number} size="xs" />,
    },
    [HTTP_RESPONSE_STATUS_CODE]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.httpResponseStatusCode.title', {
        defaultMessage: 'Status code',
      }),
      formatter: (value: unknown) => <HttpStatusCode code={value as number} />,
    },
    [TRANSACTION_ID]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.transactionId.title', {
        defaultMessage: 'Transaction ID',
      }),
    },
    [TRACE_ID]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.traceId.title', {
        defaultMessage: 'Trace ID',
      }),
      formatter: (value: unknown, formattedValue: string) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => (
            <TraceIdLink
              traceId={value as string}
              formattedTraceId={content}
              data-test-subj="unifiedDocViewerObservabilityTracesTraceIdLink"
            />
          )}
        </HighlightField>
      ),
    },
  };
};

export const getSpanFieldConfigurations = (
  flattenedHit: TraceDocumentOverview
): ContentFrameworkTableProps['fieldConfigurations'] => {
  return {
    [SPAN_ID]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.spanId.title', {
        defaultMessage: 'Span ID',
      }),
    },
    [SPAN_NAME]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.spanName.title', {
        defaultMessage: 'Span Name',
      }),
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE]: {
      title: i18n.translate(
        'unifiedDocViewer.observability.traces.spanDestinationServiceResource.title',
        {
          defaultMessage: 'Dependency',
        }
      ),
      formatter: (value: unknown, formattedValue: string) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => (
            <DependencyNameLink
              dependencyName={value as string}
              spanType={flattenedHit[SPAN_TYPE] ?? ''}
              spanSubtype={flattenedHit[SPAN_SUBTYPE] ?? ''}
              environment={flattenedHit[SERVICE_ENVIRONMENT] ?? ''}
              formattedDependencyName={content}
            />
          )}
        </HighlightField>
      ),
      description: i18n.translate(
        'unifiedDocViewer.observability.traces.spanDestinationServiceResource.description',
        {
          defaultMessage: 'Identifier for the destination service resource being operated on.',
        }
      ),
    },
    [SPAN_DURATION]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.spanDuration.title', {
        defaultMessage: 'Duration',
      }),
    },
    [SPAN_TYPE]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.spanType.title', {
        defaultMessage: 'Type',
      }),
      formatter: (value, formattedValue) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
        </HighlightField>
      ),
    },
    [SPAN_SUBTYPE]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.spanSubtype.title', {
        defaultMessage: 'Subtype',
      }),
      formatter: (value, formattedValue) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
        </HighlightField>
      ),
    },
  };
};

export const getTransactionFieldConfigurations = (
  flattenedHit: TraceDocumentOverview
): ContentFrameworkTableProps['fieldConfigurations'] => {
  return {
    [TRANSACTION_NAME]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.transactionName.title', {
        defaultMessage: 'Transaction name',
      }),
      formatter: (value, formattedValue) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => (
            <TransactionNameLink
              serviceName={flattenedHit[SERVICE_NAME] ?? ''}
              transactionName={value as string}
              renderContent={() => content}
            />
          )}
        </HighlightField>
      ),
    },
    [TRANSACTION_DURATION]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.transactionDuration.title', {
        defaultMessage: 'Duration',
      }),
    },
    [USER_AGENT_NAME]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.userAgent.title', {
        defaultMessage: 'User agent',
      }),
    },
    [USER_AGENT_VERSION]: {
      title: i18n.translate('unifiedDocViewer.observability.traces.userAgentVersion.title', {
        defaultMessage: 'User agent version',
      }),
    },
  };
};
