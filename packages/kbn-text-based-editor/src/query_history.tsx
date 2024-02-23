/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableSortingType,
  EuiButtonEmpty,
  formatDate,
  Criteria,
  EuiButtonIcon,
} from '@elastic/eui';
import { css, Interpolation, Theme } from '@emotion/react';

interface QueryHistoryItem {
  status: 'success' | 'error' | 'warning';
  queryString: string;
  duration: string;
  timeRun: string;
}

export function QueryHistoryAction({
  toggleHistory,
  isHistoryOpen,
  isSpaceReduced,
}: {
  toggleHistory: () => void;
  isHistoryOpen: boolean;
  isSpaceReduced?: boolean;
}) {
  return (
    <>
      {isSpaceReduced && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" color="primary" size="s" />
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            color={'primary'}
            onClick={toggleHistory}
            css={css`
              padding-inline: 0;
            `}
            iconType="clock"
          >
            {isHistoryOpen
              ? i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.hideQueriesLabel', {
                  defaultMessage: 'Hide recent queries',
                })
              : i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.showQueriesLabel', {
                  defaultMessage: 'Show recent queries',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </>
  );
}

// temporary, retrieve from localStorate
const items: QueryHistoryItem[] = [
  {
    status: 'success',
    queryString:
      'from logstash-* | limit 10 | EVAL timestamp=DATE_TRUNC(30 minute, @timestamp) | stats results = count(*) by timestamp | rename timestamp as `@timestamp every 30 minute`',
    duration: '128ms',
    timeRun: '12 September 2023',
  },
  {
    status: 'error',
    queryString: 'from logstash-* | limit 10',
    duration: '13ms',
    timeRun: '12 November 2023',
  },
];

export const getTableColumns = (width: number): Array<EuiBasicTableColumn<QueryHistoryItem>> => {
  return [
    {
      field: 'status',
      name: '',
      sortable: false,
      render: (status: QueryHistoryItem['status']) => {
        switch (status) {
          case 'success':
          default:
            return <EuiIcon type="checkInCircleFilled" color="success" size="s" />;
          case 'error':
            return <EuiIcon type="error" color="danger" size="s" />;
        }
      },
      width: '40px',
    },
    {
      field: 'queryString',
      name: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.recentQueriesColumnLabel',
        {
          defaultMessage: 'Recent queries',
        }
      ),
      render: (queryString: QueryHistoryItem['queryString']) => (
        <QueryColumn queryString={queryString} containerWidth={width} />
      ),
      truncateText: false,
      sortable: false,
    },
    {
      field: 'timeRun',
      name: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.timeRunColumnLabel', {
        defaultMessage: 'Time run',
      }),
      sortable: true,
      render: (timeRun: QueryHistoryItem['timeRun']) => formatDate(timeRun, 'dobLong'),
      width: '240px',
    },
    {
      field: 'duration',
      name: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.lastDurationColumnLabel',
        {
          defaultMessage: 'Last duration',
        }
      ),
      sortable: false,
      width: '120px',
    },
  ];
};

export function QueryHistory({
  containerCSS,
  containerWidth,
  runQuery,
}: {
  containerCSS: Interpolation<Theme>;
  containerWidth: number;
  runQuery: () => void;
}) {
  const columns = useMemo(() => {
    return getTableColumns(containerWidth);
  }, [containerWidth]);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const onTableChange = ({ page, sort }: Criteria<QueryHistoryItem>) => {
    if (sort) {
      const { direction } = sort;
      setSortDirection(direction);
    }
  };

  const sorting: EuiTableSortingType<QueryHistoryItem> = {
    sort: {
      field: 'timeRun',
      direction: sortDirection,
    },
    enableAllColumns: false,
    readOnly: false,
  };

  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      gutterSize="none"
      data-test-subj="TextBasedLangEditor-queryHistory"
      css={containerCSS}
      responsive={false}
    >
      <EuiBasicTable
        tableCaption={i18n.translate(
          'textBasedEditor.query.textBasedLanguagesEditor.querieshistoryTable',
          {
            defaultMessage: 'Queries history table',
          }
        )}
        items={items}
        columns={columns}
        sorting={sorting}
        onChange={onTableChange}
        css={css`
          width: 100%;
          .euiTable {
            background-color: ${euiTheme.colors.lightestShade};
          }
        `}
        tableLayout="auto"
      />
    </EuiFlexGroup>
  );
}

export function QueryColumn({
  queryString,
  containerWidth,
}: {
  containerWidth: number;
  queryString: string;
}) {
  const { euiTheme } = useEuiTheme();
  const REST_ELEMENTS_WIDTH = 455;
  const containerRef = useRef<HTMLElement>(null);

  const [isExpandable, setIsExpandable] = useState(false);
  const [isRowExpanded, setIsRowExpanded] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const textIsOverlapping = containerRef.current.offsetWidth < containerRef.current.scrollWidth;
      setIsExpandable(textIsOverlapping);
    }
  }, []);

  return (
    <>
      {isExpandable && (
        <EuiButtonIcon
          onClick={() => {
            setIsRowExpanded(!isRowExpanded);
          }}
          aria-label={
            isRowExpanded
              ? i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.collapseLabel', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.expandLabel', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={isRowExpanded ? 'arrowDown' : 'arrowRight'}
          size="xs"
        />
      )}
      <span
        css={css`
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: ${isRowExpanded ? 'pre-wrap' : 'nowrap'};
          width: ${containerWidth - REST_ELEMENTS_WIDTH}px;
          padding-left: ${isExpandable ? euiTheme.size.s : euiTheme.size.xl};
        `}
        ref={containerRef}
      >
        {queryString}
      </span>
    </>
  );
}
