/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiTextTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import { Duration } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SpanLinkDetails } from '@kbn/apm-types';
import type { SpanLinkType } from '.';
import { ServiceNameWithIcon } from '../service_name_with_icon';
import { NOT_AVAILABLE_LABEL } from '../../common/constants';
import { DiscoverEsqlLink } from '../discover_esql_link';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import {
  createServiceNameWhereClause,
  createSpanNameWhereClause,
  createTraceIdWhereClause,
} from './create_span_links_where_clauses';

const SpanNameLinkCell = ({ type, item }: { type: SpanLinkType; item: SpanLinkDetails }) => {
  const { indexes } = useDataSourcesContext();

  const content = (
    <EuiTextTruncate
      data-test-subj={`${type}-spanName-${item.spanId}`}
      text={item.details?.spanName || NOT_AVAILABLE_LABEL}
    />
  );

  return (
    <DiscoverEsqlLink
      indexPattern={indexes.apm.traces}
      dataTestSubj={`${type}-spanNameLink-${item.spanId}`}
      tabLabel={item.details?.spanName || NOT_AVAILABLE_LABEL}
      whereClause={createSpanNameWhereClause(item)}
    >
      {content}
    </DiscoverEsqlLink>
  );
};

const ServiceNameLinkCell = ({ type, item }: { type: SpanLinkType; item: SpanLinkDetails }) => {
  const { indexes } = useDataSourcesContext();

  const serviceName = item.details?.serviceName || NOT_AVAILABLE_LABEL;
  const content = (
    <EuiTextTruncate data-test-subj={`${type}-serviceName-${serviceName}`} text={serviceName} />
  );

  return (
    <ServiceNameWithIcon
      agentName={item.details?.agentName}
      serviceName={
        <DiscoverEsqlLink
          indexPattern={indexes.apm.traces}
          dataTestSubj={`${type}-serviceNameLink-${serviceName}`}
          tabLabel={serviceName}
          whereClause={createServiceNameWhereClause(item)}
        >
          {content}
        </DiscoverEsqlLink>
      }
    />
  );
};

const TraceIdLinkCell = ({ type, item }: { type: SpanLinkType; item: SpanLinkDetails }) => {
  const { indexes } = useDataSourcesContext();

  const content = (
    <EuiTextTruncate data-test-subj={`${type}-traceId-${item.traceId}`} text={item.traceId} />
  );

  return (
    <DiscoverEsqlLink
      indexPattern={indexes.apm.traces}
      dataTestSubj={`${type}-traceIdLink-${item.traceId}`}
      tabLabel={item.traceId}
      whereClause={createTraceIdWhereClause(item)}
    >
      {content}
    </DiscoverEsqlLink>
  );
};

export const getColumns = ({
  type,
}: {
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
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          <SpanNameLinkCell type={type} item={item} />
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
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          <ServiceNameLinkCell type={type} item={item} />
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
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          <TraceIdLinkCell type={type} item={item} />
        </span>
      );
    },
  },
];
