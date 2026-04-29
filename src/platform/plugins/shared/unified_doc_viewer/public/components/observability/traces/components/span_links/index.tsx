/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiInMemoryTableProps, EuiSelectOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { where } from '@kbn/esql-composer';
import {
  OTEL_LINKS_SPAN_ID,
  OTEL_LINKS_TRACE_ID,
  SPAN_ID_FIELD,
  SPAN_LINKS_TRACE_ID,
  TRACE_ID_FIELD,
} from '@kbn/discover-utils';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { SPAN_LINKS_SPAN_ID } from '@kbn/apm-types';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
import { ContentFrameworkSection } from '../../../../content_framework/lazy_content_framework_section';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { getColumns } from './get_columns';
import { useFetchSpanLinks } from './use_fetch_span_links';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../../hooks/use_open_in_discover_section_action';

const sectionTitle = i18n.translate(
  'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks',
  { defaultMessage: 'Span links' }
);

export interface Props {
  traceId: string;
  docId: string;
  processorEvent?: ProcessorEvent;
}

export type SpanLinkType = 'incoming' | 'outgoing';

const sorting: EuiInMemoryTableProps['sorting'] = {
  sort: { field: 'duration', direction: 'desc' as const },
};

export function SpanLinks({ docId, traceId, processorEvent }: Props) {
  const { indexes } = useDataSourcesContext();
  const [type, setType] = useState<SpanLinkType>('incoming');
  const { loading, error, value } = useFetchSpanLinks({ docId, traceId, processorEvent });
  const spanLinks = type === 'incoming' ? value.incomingSpanLinks : value.outgoingSpanLinks;

  useEffect(() => {
    const hasData = value.incomingSpanLinks.length > 0 || value.outgoingSpanLinks.length > 0;
    if (hasData) {
      if (type === 'incoming' && value.incomingSpanLinks.length === 0) {
        setType('outgoing');
      } else if (type === 'outgoing' && value.outgoingSpanLinks.length === 0) {
        setType('incoming');
      }
    }
  }, [value, type]);

  const selectOptions: EuiSelectOption[] = useMemo(
    () => [
      {
        'data-test-subj': 'unifiedDocViewerSpanLinkTypeSelect-incoming',
        value: 'incoming',
        text: i18n.translate(
          'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.combo.incomingLinks',
          {
            defaultMessage: 'Incoming links ({incomingLinks})',
            values: { incomingLinks: value.incomingSpanLinks.length },
          }
        ),
        disabled: !value.incomingSpanLinks.length,
      },
      {
        'data-test-subj': 'unifiedDocViewerSpanLinkTypeSelect-outgoing',
        value: 'outgoing',
        text: i18n.translate(
          'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.combo.outgoingLinks',
          {
            defaultMessage: 'Outgoing links ({outgoingLinks})',
            values: { outgoingLinks: value.outgoingSpanLinks.length },
          }
        ),
        disabled: !value.outgoingSpanLinks.length,
      },
    ],
    [value]
  );

  const columns = useMemo(() => getColumns({ type }), [type]);

  const whereClause = useMemo(() => {
    if (type === 'incoming') {
      return getIncomingSpanLinksESQL(traceId, docId);
    }

    if (spanLinks.length) {
      return getOutgoingSpanLinksESQL(spanLinks);
    }
  }, [docId, spanLinks, traceId, type]);

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern: indexes.apm.traces,
    whereClause,
  });

  const openInDiscoverSectionAction = useOpenInDiscoverSectionAction({
    href: discoverUrl,
    esql: esqlQueryString,
    tabLabel: sectionTitle,
    dataTestSubj: 'docViewerSpanLinksOpenInDiscoverButton',
  });
  const actions = useMemo(
    () => (openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    [openInDiscoverSectionAction]
  );

  if (
    loading ||
    (!error && value.incomingSpanLinks.length === 0 && value.outgoingSpanLinks.length === 0)
  ) {
    return null;
  }

  return (
    <ContentFrameworkSection
      data-test-subj="unifiedDocViewerSpanLinksAccordion"
      id="spanLinksSection"
      title={sectionTitle}
      description={i18n.translate(
        'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.description',
        { defaultMessage: 'Links to spans or transactions that are causally related' }
      )}
      actions={actions}
    >
      <EuiSpacer size="s" />
      {error ? (
        <EuiText color="subdued">
          {i18n.translate('unifiedDocViewer.observability.traces.docViewerSpanOverview.error', {
            defaultMessage: 'An error happened when trying to fetch data. Please try again',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem
                css={css`
                  align-items: flex-end;
                `}
              >
                <EuiSelect
                  compressed
                  aria-label={i18n.translate(
                    'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.select.ariaLabel',
                    {
                      defaultMessage: 'Span link type selector',
                    }
                  )}
                  data-test-subj="unifiedDocViewerSpanLinkTypeSelect"
                  options={selectOptions}
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as SpanLinkType);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="s">
              <EuiInMemoryTable
                tableCaption={sectionTitle}
                responsiveBreakpoint={false}
                items={spanLinks}
                columns={columns}
                pagination={{ showPerPageOptions: false, pageSize: 5 }}
                sorting={sorting}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </ContentFrameworkSection>
  );
}

export function getIncomingSpanLinksESQL(traceId: string, docId: string) {
  return where(
    `QSTR("${OTEL_LINKS_TRACE_ID}:${traceId} AND ${OTEL_LINKS_SPAN_ID}:${docId}") OR QSTR("${SPAN_LINKS_TRACE_ID}:${traceId} AND ${SPAN_LINKS_SPAN_ID}:${docId}")`
  );
}

export function getOutgoingSpanLinksESQL(spanLinks: SpanLinkDetails[]) {
  const traceIds: string[] = [];
  const spanIds: string[] = [];

  spanLinks.forEach(({ traceId, spanId }) => {
    traceIds.push(traceId);
    spanIds.push(spanId);
  });

  return where(
    `${TRACE_ID_FIELD} IN (${traceIds.map(() => '?').join()}) AND ${SPAN_ID_FIELD} IN (${spanIds
      .map(() => '?')
      .join()})`,
    [...traceIds, ...spanIds]
  );
}
