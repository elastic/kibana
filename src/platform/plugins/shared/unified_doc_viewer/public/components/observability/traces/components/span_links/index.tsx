/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn, EuiInMemoryTableProps, EuiSelectOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSelectableMessage,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { Duration } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { ServiceNameWithIcon } from '../service_name_with_icon';
import { useDataSourcesContext } from '../../hooks/use_data_sources';

export interface Props {
  traceId: string;
  docId: string;
}

type SpanLinkType = 'incoming' | 'outgoing';

const sorting: EuiInMemoryTableProps['sorting'] = {
  sort: { field: 'duration', direction: 'desc' as const },
};

export function SpanLinks({ docId, traceId }: Props) {
  const {
    discoverShared,
    data,
    share: {
      url: { locators },
    },
  } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();

  const [type, setType] = useState<SpanLinkType>('incoming');

  const timeFilter = data.query.timefilter.timefilter.getAbsoluteTime();

  const fetchSpanLinks = discoverShared.features.registry.getById(
    'observability-traces-fetch-span-links'
  );
  const discoverLocator = useMemo(() => locators.get('DISCOVER_APP_LOCATOR'), [locators]);
  const generateDiscoverLink = useCallback(
    (whereClause?: string) => {
      if (!discoverLocator || !whereClause || !indexes.apm.traces) {
        return undefined;
      }
      const url = discoverLocator.getRedirectUrl({
        timeRange: timeFilter,
        filters: [],
        query: {
          language: 'kuery',
          esql: `FROM ${indexes.apm.traces} | ${whereClause}`,
        },
      });

      return url;
    },
    [discoverLocator, indexes.apm.traces, timeFilter]
  );

  const { loading, error, value } = useAbortableAsync(
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

  useEffect(() => {
    if (type === 'incoming' && value?.incomingSpanLinks.length === 0) {
      setType('outgoing');
    }
  }, [value, type]);

  const items = useMemo(() => {
    return (type === 'incoming' ? value?.incomingSpanLinks : value?.outgoingSpanLinks) || [];
  }, [type, value?.incomingSpanLinks, value?.outgoingSpanLinks]);

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

  const columns: Array<EuiBasicTableColumn<SpanLinkDetails>> = useMemo(
    () => [
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
              text={item.details?.spanName || 'N/A'}
            />
          );
          return (
            <span
              css={css`
                width: 100%;
              `}
            >
              {indexes.apm.traces ? (
                <EuiLink href={generateDiscoverLink(`WHERE span.id == "${item.spanId}"`)}>
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
        sortable: (item) => item.details?.serviceName || 'N/A',
        render: (_, item) => {
          const serviceName = item.details?.serviceName || 'N/A';
          const content = (
            <EuiTextTruncate
              data-test-subj={`${type}-serviceName-${serviceName}`}
              text={serviceName}
            />
          );
          return (
            <span
              css={css`
                width: 100%;
              `}
            >
              <ServiceNameWithIcon
                agentName={item.details?.agentName}
                serviceName={
                  indexes.apm.traces && item.details?.serviceName ? (
                    <EuiLink
                      href={generateDiscoverLink(
                        `WHERE service.name == "${item.details!.serviceName}"`
                      )}
                    >
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
            <EuiTextTruncate
              data-test-subj={`${type}-traceId-${item.traceId}`}
              text={item.traceId}
            />
          );
          return (
            <span
              css={css`
                width: 100%;
              `}
            >
              {indexes.apm.traces ? (
                <EuiLink href={generateDiscoverLink(`WHERE trace.id == "${item.traceId}"`)}>
                  {content}
                </EuiLink>
              ) : (
                content
              )}
            </span>
          );
        },
      },
    ],
    [generateDiscoverLink, indexes.apm.traces, type]
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
            {items.length === 0 ? (
              <EuiSelectableMessage>
                <p>
                  {i18n.translate(
                    'unifiedDocViewer.observability.traces.docViewerSpanOverview.spanLinks.grid.noDataFound',
                    { defaultMessage: 'No span links found' }
                  )}
                </p>
              </EuiSelectableMessage>
            ) : (
              <>
                <EuiInMemoryTable
                  responsiveBreakpoint={false}
                  items={items}
                  columns={columns}
                  pagination={{ showPerPageOptions: false, pageSize: 5 }}
                  sorting={sorting}
                />
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
}
