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
import { HttpStatusCode, Timestamp } from '@kbn/apm-ui-shared';
import { EuiBadge } from '@elastic/eui';
import type { TraceDocumentOverview } from '@kbn/discover-utils';
import type { ContentFrameworkTableProps } from '../../../../content_framework';
import { ServiceNameLink } from '../service_name_link';
import { TransactionNameLink } from '../transaction_name_link';
import { HighlightField } from '../highlight_field';
import { DependencyNameLink } from '../dependency_name_link';
import { fieldDescriptions, fieldLabels } from '../../../constants';

export const getSharedFieldConfigurations = (
  flattenedHit: TraceDocumentOverview
): ContentFrameworkTableProps['fieldConfigurations'] => {
  return {
    [SERVICE_NAME]: {
      title: fieldLabels.SERVICE_NAME_LABEL,
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
      title: fieldLabels.AT_TIMESTAMP_LABEL,
      formatter: (value: unknown) => <Timestamp timestamp={value as number} size="xs" />,
    },
    [HTTP_RESPONSE_STATUS_CODE]: {
      title: fieldLabels.HTTP_RESPONSE_STATUS_CODE_LABEL,
      formatter: (value: unknown) => <HttpStatusCode code={value as number} />,
    },
    [TRANSACTION_ID]: {
      title: fieldLabels.TRANSACTION_ID_LABEL,
    },
    [TRACE_ID]: {
      title: fieldLabels.TRACE_ID_LABEL,
      formatter: (value: unknown, formattedValue: string) => (
        <HighlightField value={value as string} formattedValue={formattedValue} />
      ),
    },
  };
};

export const getSpanFieldConfigurations = (
  flattenedHit: TraceDocumentOverview
): ContentFrameworkTableProps['fieldConfigurations'] => {
  return {
    [SPAN_ID]: {
      title: fieldLabels.SPAN_ID_LABEL,
    },
    [SPAN_NAME]: {
      title: fieldLabels.SPAN_NAME_LABEL,
    },
    [SPAN_DESTINATION_SERVICE_RESOURCE]: {
      title: fieldLabels.SPAN_DESTINATION_SERVICE_RESOURCE_LABEL,
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
      description: fieldDescriptions.SPAN_DESTINATION_SERVICE_RESOURCE_DESCRIPTION,
    },
    [SPAN_DURATION]: {
      title: fieldLabels.SPAN_DURATION_LABEL,
    },
    [SPAN_TYPE]: {
      title: fieldLabels.SPAN_TYPE_LABEL,
      formatter: (value, formattedValue) => (
        <HighlightField value={value as string} formattedValue={formattedValue}>
          {({ content }) => <EuiBadge color="hollow">{content}</EuiBadge>}
        </HighlightField>
      ),
    },
    [SPAN_SUBTYPE]: {
      title: fieldLabels.SPAN_SUBTYPE_LABEL,
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
      title: fieldLabels.TRANSACTION_NAME_LABEL,
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
      title: fieldLabels.TRANSACTION_DURATION_LABEL,
    },
    [USER_AGENT_NAME]: {
      title: fieldLabels.USER_AGENT_NAME_LABEL,
    },
    [USER_AGENT_VERSION]: {
      title: fieldLabels.USER_AGENT_VERSION_LABEL,
    },
  };
};
