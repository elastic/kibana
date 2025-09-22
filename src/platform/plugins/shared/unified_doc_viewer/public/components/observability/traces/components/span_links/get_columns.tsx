/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink, EuiTextTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import { Duration } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SpanLinkDetails } from '@kbn/apm-types';
import {
  SERVICE_NAME_FIELD,
  SPAN_ID_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
} from '@kbn/discover-utils';
import type { SpanLinkType } from '.';
import { ServiceNameWithIcon } from '../service_name_with_icon';
import type { GenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';
import { NOT_AVAILABLE_LABEL } from '../../common/constants';

export const getColumns = ({
  generateDiscoverLink,
  type,
}: {
  generateDiscoverLink: GenerateDiscoverLink;
  type: SpanLinkType;
}): Array<EuiBasicTableColumn<SpanLinkDetails>> => [
  {
    field: 'span',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.span',
      { defaultMessage: 'Span' }
    ),
    sortable: (item) => item.details?.spanName || '',
    render: (_, item) => {
      const content = (
        <EuiTextTruncate
          data-test-subj={`${type}-spanName-${item.spanId}`}
          text={item.details?.spanName || NOT_AVAILABLE_LABEL}
        />
      );
      const href = generateDiscoverLink(
        item.details?.transactionId
          ? { [TRANSACTION_ID_FIELD]: item.details.transactionId }
          : { [SPAN_ID_FIELD]: item.spanId }
      );
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          {href ? (
            <EuiLink data-test-subj={`${type}-spanNameLink-${item.spanId}`} href={href}>
              {content}
            </EuiLink>
          ) : (
            content
          )}
        </span>
      );
    },
  },
  {
    field: 'duration',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.duration',
      { defaultMessage: 'Duration' }
    ),
    sortable: (item) => item.details?.duration || 0,
    render: (_, item) => {
      return <Duration duration={item.details?.duration || 0} />;
    },
  },
  {
    field: 'serviceName',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.serviceName',
      { defaultMessage: 'Service name' }
    ),
    sortable: (item) => item.details?.serviceName || NOT_AVAILABLE_LABEL,
    render: (_, item) => {
      const serviceName = item.details?.serviceName || NOT_AVAILABLE_LABEL;
      const content = (
        <EuiTextTruncate data-test-subj={`${type}-serviceName-${serviceName}`} text={serviceName} />
      );
      const href = item.details?.serviceName
        ? generateDiscoverLink({ [SERVICE_NAME_FIELD]: item.details!.serviceName })
        : undefined;
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          <ServiceNameWithIcon
            agentName={item.details?.agentName}
            serviceName={
              href ? (
                <EuiLink data-test-subj={`${type}-serviceNameLink-${serviceName}`} href={href}>
                  {content}
                </EuiLink>
              ) : (
                content
              )
            }
          />
        </span>
      );
    },
  },
  {
    field: 'traceId',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.traceId',
      { defaultMessage: 'Trace ID' }
    ),
    sortable: (item) => item.traceId,
    render: (_, item) => {
      const content = (
        <EuiTextTruncate data-test-subj={`${type}-traceId-${item.traceId}`} text={item.traceId} />
      );
      const href = generateDiscoverLink({ [TRACE_ID_FIELD]: item.traceId });
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          {href ? (
            <EuiLink data-test-subj={`${type}-traceIdLink-${item.traceId}`} href={href}>
              {content}
            </EuiLink>
          ) : (
            content
          )}
        </span>
      );
    },
  },
];
