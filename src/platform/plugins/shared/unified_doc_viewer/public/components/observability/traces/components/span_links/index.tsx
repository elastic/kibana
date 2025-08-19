/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridProps, EuiSelectOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSelectableMessage,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
} from '@elastic/eui';
import type { SpanLinks } from '@kbn/apm-types';
import { Duration } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync, type AbortableAsyncState } from '@kbn/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { ServiceNameWithIcon } from '../service_name_with_icon';

export interface Props {
  traceId: string;
  docId: string;
}

export function SpanLinks({ docId, traceId }: Props) {
  const { discoverShared, data } = getUnifiedDocViewerServices();
  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  const fetchSpanLinks = discoverShared.features.registry.getById(
    'observability-traces-fetch-span-links'
  );

  const spanLinksResponse = useAbortableAsync(
    async ({ signal }) => {
      if (!fetchSpanLinks) {
        return null;
      }

      return fetchSpanLinks.fetchSpanLinks(
        { docId, traceId, start: timeFilter.from, end: timeFilter.to },
        signal
      );
    },
    [fetchSpanLinks]
  );

  return <SpanLinksComponent data={spanLinksResponse} />;
}

const GRID_PROPS: Pick<EuiDataGridProps, 'gridStyle'> = {
  gridStyle: {
    border: 'none',
    header: 'underline',
  },
};
const visibleColumns = ['span', 'duration', 'serviceName', 'traceId'];
type SpanLinkType = 'incoming' | 'outgoing';

interface SpanLinksComponentProps {
  data: AbortableAsyncState<SpanLinks | null>;
}

const columns: EuiDataGridProps['columns'] = [
  {
    id: 'span',
    actions: false,
    displayAsText: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.span',
      { defaultMessage: 'Span' }
    ),
  },
  {
    id: 'duration',
    actions: false,
    displayAsText: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.duration',
      {
        defaultMessage: 'Duration',
      }
    ),
  },
  {
    id: 'serviceName',
    actions: false,
    displayAsText: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.serviceName',
      {
        defaultMessage: 'Service name',
      }
    ),
  },
  {
    id: 'traceId',
    actions: false,
    displayAsText: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.table.traceID',
      {
        defaultMessage: 'Trace ID',
      }
    ),
  },
];

export function SpanLinksComponent({ data }: SpanLinksComponentProps) {
  const { loading, error, value } = data;
  const [type, setType] = useState<SpanLinkType>('incoming');
  const [pageIndex, setPageIndex] = useState(0);

  const pagination = useMemo(
    () => ({
      pageSize: 5,
      pageIndex,
      pageSizeOptions: [],
      onChangePage: setPageIndex,
      onChangeItemsPerPage: () => null,
    }),
    [pageIndex]
  );

  const filteredItems = useMemo(() => {
    const items = type === 'incoming' ? value?.incomingSpanLinks : value?.outgoingSpanLinks;
    return items || [];
  }, [type, value?.incomingSpanLinks, value?.outgoingSpanLinks]);

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useCallback(
    ({ rowIndex, columnId }) => {
      const item = filteredItems[rowIndex];
      switch (columnId) {
        case 'span':
          return (
            <EuiTextTruncate
              data-test-subj={`${type}-spanName-${item.spanId}`}
              text={item.details?.spanName || 'N/A'}
            />
          );
        case 'duration':
          return <Duration duration={item.details?.duration || 0} />;
        case 'serviceName':
          return (
            <ServiceNameWithIcon
              agentName={item.details?.agentName}
              serviceName={item.details?.serviceName || 'N/A'}
              truncate
            />
          );
        case 'traceId':
          return <EuiTextTruncate text={item.traceId} />;
      }
    },
    [filteredItems, type]
  );

  useEffect(() => {
    if (type === 'incoming' && value?.incomingSpanLinks.length === 0) {
      setType('outgoing');
    }
  }, [value, type]);

  const selectOptions: EuiSelectOption[] = useMemo(
    () => [
      {
        'data-test-subj': 'spanLinkTypeSelect-incoming',
        value: 'incoming',
        text: i18n.translate(
          'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.combo.incomingLinks',
          {
            defaultMessage: 'Incoming links ({incomingLinks})',
            values: { incomingLinks: value?.incomingSpanLinks.length },
          }
        ),
        disabled: !value?.incomingSpanLinks.length,
      },
      {
        'data-test-subj': 'spanLinkTypeSelect-outgoing',
        value: 'outgoing',
        text: i18n.translate(
          'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.combo.outgoingLinks',
          {
            defaultMessage: 'Outgoing links ({outgoingLinks})',
            values: { outgoingLinks: value?.outgoingSpanLinks.length },
          }
        ),
        disabled: !value?.outgoingSpanLinks.length,
      },
    ],
    [value]
  );

  if (
    loading ||
    (!error && value?.incomingSpanLinks.length === 0 && value?.outgoingSpanLinks.length === 0)
  ) {
    return null;
  }

  return (
    <EuiAccordion
      data-test-subj="spanLinksAccordion"
      id="spanLinksAccordion"
      buttonContent={
        <strong>
          {i18n.translate('unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks', {
            defaultMessage: 'Span links',
          })}
        </strong>
      }
      initialIsOpen
      paddingSize="none"
    >
      <EuiSpacer size="s" />
      {error ? (
        <EuiText color="subdued">
          {i18n.translate('unifiedDocViewer.observability.traces.docViewerSpanOverview.error', {
            defaultMessage: 'An error happened when trying to fetch data. Please try again',
          })}
        </EuiText>
      ) : null}

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem
              css={css`
                align-items: flex-end;
              `}
            >
              <EuiSelect
                aria-label={i18n.translate(
                  'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.select.ariaLabel',
                  {
                    defaultMessage: 'Span link type selector',
                  }
                )}
                data-test-subj="spanLinkTypeSelect"
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
            {filteredItems.length === 0 ? (
              <EuiSelectableMessage>
                <p>
                  {i18n.translate(
                    'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.grid.noDataFound',
                    { defaultMessage: 'No span links found' }
                  )}
                </p>
              </EuiSelectableMessage>
            ) : (
              <EuiDataGrid
                {...GRID_PROPS}
                aria-label={i18n.translate(
                  'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.grid.ariaLabel',
                  { defaultMessage: 'Span links data grid' }
                )}
                columns={columns}
                pagination={pagination}
                rowCount={filteredItems.length}
                renderCellValue={renderCellValue}
                columnVisibility={{ visibleColumns, setVisibleColumns: () => null }}
                toolbarVisibility={false}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
}
