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
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { Duration, HttpStatusCode, Timestamp } from '@kbn/apm-ui-shared';
import { EuiBadge } from '@elastic/eui';
import type { ContentFrameworkTableProps } from '../../../../content_framework';
import { ServiceNameLink } from '../service_name_link';
import { DependencyNameLink } from '../../doc_viewer_span_overview/sub_components/dependency_name_link';
import { TransactionNameLink } from '../transaction_name_link';

// TODO This is currently kind of a duplication of what we have in:
// src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/resources/get_field_configuration.tsx
// src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/doc_viewer_span_overview/resources/get_span_field_configuration.tsx
// that will be removed once all the overview is changed

export const sharedFieldConfigurations: ContentFrameworkTableProps['fieldConfigurations'] = {
  [SERVICE_NAME]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.serviceName.title', {
      defaultMessage: 'Service Name',
    }),
    formatter: (value: unknown, formattedValue: string) => (
      <ServiceNameLink
        serviceName={value as string}
        agentName={''} // {flattenedDoc[AGENT_NAME_FIELD]} TODO check how to get this
        formattedServiceName={formattedValue}
      />
    ), // TODO should I update the link to go to discover instead of APM? (same as the span links links)
  },
  [AT_TIMESTAMP]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.timestamp.title', {
      defaultMessage: 'Start time',
    }), // TODO check timestamp formatter, something is happening here
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
    }), // TODO add link? Same question as in the trace section.
  },
};

export const spanFieldConfigurations: ContentFrameworkTableProps['fieldConfigurations'] = {
  [SPAN_ID]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.spanId.title', {
      defaultMessage: 'Span ID',
    }), // TODO add link?
  },
  [SPAN_NAME]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.spanName.title', {
      defaultMessage: 'Span Name',
    }), // TODO add link?
  },
  [SPAN_DESTINATION_SERVICE_RESOURCE]: {
    title: i18n.translate(
      'unifiedDocViewer.observability.traces.spanDestinationServiceResource.title',
      {
        defaultMessage: 'Dependency',
      }
    ),
    formatter: (value: unknown, formattedValue: string) => (
      <DependencyNameLink
        dependencyName={value as string}
        spanType={''} // {flattenedDoc[SPAN_TYPE_FIELD]} TODO check how to get this
        spanSubtype={''} // {flattenedDoc[SPAN_SUBTYPE_FIELD]} TODO check how to get this
        environment={''} // {flattenedDoc[SERVICE_ENVIRONMENT_FIELD]} TODO check how to get this
        formattedDependencyName={formattedValue}
      />
    ), // TODO should I update the link to go to discover instead of APM? (same as the span links links)
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
    formatter: (value: unknown) => <Duration duration={value as number} size="xs" />,
  },
  [SPAN_TYPE]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.spanType.title', {
      defaultMessage: 'Type',
    }),
    formatter: (value, formattedValue) => <EuiBadge color="hollow">{formattedValue}</EuiBadge>,
  },
  [SPAN_SUBTYPE]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.spanSubtype.title', {
      defaultMessage: 'Subtype',
    }),
    formatter: (value, formattedValue) => <EuiBadge color="hollow">{formattedValue}</EuiBadge>,
  },
};

export const transactionFieldConfigurations: ContentFrameworkTableProps['fieldConfigurations'] = {
  [TRANSACTION_NAME]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.transactionName.title', {
      defaultMessage: 'Transaction name',
    }),
    formatter: (value, formattedValue) => (
      <TransactionNameLink
        serviceName={''} // flattenedDoc[SERVICE_NAME_FIELD] TODO check how to get this
        transactionName={value as string}
        renderContent={() => formattedValue}
      />
    ),
  },
  [TRANSACTION_DURATION]: {
    title: i18n.translate('unifiedDocViewer.observability.traces.transactionDuration.title', {
      defaultMessage: 'Duration',
    }),
    formatter: (value: unknown) => <Duration duration={value as number} size="xs" />,
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
