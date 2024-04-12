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
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  Criteria,
  EuiButtonIcon,
  CustomItemAction,
  EuiCopy,
  EuiToolTip,
  euiScrollBarStyles,
} from '@elastic/eui';
import { css, Interpolation, Theme } from '@emotion/react';
import { type QueryHistoryItem, getHistoryItems } from './history_local_storage';
import { getReducedSpaceStyling, swapArrayElements } from './query_history_helpers';

const CONTAINER_MAX_HEIGHT_EXPANDED = 190;
const CONTAINER_MAX_HEIGHT_COMPACT = 250;

export function QueryHistoryAction({
  toggleHistory,
  isHistoryOpen,
  isSpaceReduced,
}: {
  toggleHistory: () => void;
  isHistoryOpen: boolean;
  isSpaceReduced?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  // get history items from local storage
  const items: QueryHistoryItem[] = getHistoryItems('desc');
  if (!items.length) return null;
  return (
    <>
      {isSpaceReduced && (
        <EuiFlexItem grow={false} data-test-subj="TextBasedLangEditor-toggle-query-history-icon">
          <EuiIcon
            type="clock"
            color="primary"
            size="m"
            onClick={toggleHistory}
            css={css`
              margin-right: ${euiTheme.size.s};
              cursor: pointer;
            `}
          />
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <EuiFlexItem
          grow={false}
          data-test-subj="TextBasedLangEditor-toggle-query-history-button-container"
        >
          <EuiButtonEmpty
            size="xs"
            color="primary"
            onClick={toggleHistory}
            css={css`
              padding-inline: 0;
            `}
            iconType="clock"
            data-test-subj="TextBasedLangEditor-toggle-query-history-button"
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

export const getTableColumns = (
  width: number,
  isOnReducedSpaceLayout: boolean,
  actions: Array<CustomItemAction<QueryHistoryItem>>
): Array<EuiBasicTableColumn<QueryHistoryItem>> => {
  const columnsArray = [
    {
      field: 'status',
      name: '',
      sortable: false,
      'data-test-subj': 'status',
      render: (status: QueryHistoryItem['status']) => {
        switch (status) {
          case 'success':
          default:
            return (
              <EuiToolTip
                position="top"
                content={i18n.translate(
                  'textBasedEditor.query.textBasedLanguagesEditor.querieshistory.success',
                  {
                    defaultMessage: 'Query run successfully',
                  }
                )}
              >
                <EuiIcon
                  type="checkInCircleFilled"
                  color="success"
                  size="m"
                  data-test-subj="TextBasedLangEditor-queryHistory-success"
                />
              </EuiToolTip>
            );
          case 'error':
            return (
              <EuiToolTip
                position="top"
                content={i18n.translate(
                  'textBasedEditor.query.textBasedLanguagesEditor.querieshistory.error',
                  {
                    defaultMessage: 'Query failed',
                  }
                )}
              >
                <EuiIcon
                  type="error"
                  color="danger"
                  size="m"
                  data-test-subj="TextBasedLangEditor-queryHistory-error"
                />
              </EuiToolTip>
            );
          case 'warning':
            return (
              <EuiToolTip
                position="top"
                content={i18n.translate(
                  'textBasedEditor.query.textBasedLanguagesEditor.querieshistory.error',
                  {
                    defaultMessage: 'Query failed',
                  }
                )}
              >
                <EuiIcon
                  type="warning"
                  color="warning"
                  size="m"
                  data-test-subj="TextBasedLangEditor-queryHistory-warning"
                />
              </EuiToolTip>
            );
        }
      },
      width: isOnReducedSpaceLayout ? 'auto' : '40px',
      css: { height: '100%' }, // Vertically align icon
    },
    {
      field: 'queryString',
      'data-test-subj': 'queryString',
      name: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.recentQueriesColumnLabel',
        {
          defaultMessage: 'Recent queries',
        }
      ),
      render: (queryString: QueryHistoryItem['queryString']) => (
        <QueryColumn
          queryString={queryString}
          containerWidth={width}
          isOnReducedSpaceLayout={isOnReducedSpaceLayout}
        />
      ),
    },
    {
      field: 'timeRan',
      'data-test-subj': 'timeRan',
      name: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.timeRanColumnLabel', {
        defaultMessage: 'Time ran',
      }),
      sortable: true,
      render: (timeRan: QueryHistoryItem['timeRan']) => timeRan,
      width: isOnReducedSpaceLayout ? 'auto' : '240px',
    },
    {
      field: 'duration',
      'data-test-subj': 'lastDuration',
      name: i18n.translate(
        'textBasedEditor.query.textBasedLanguagesEditor.lastDurationColumnLabel',
        {
          defaultMessage: 'Last duration',
        }
      ),
      sortable: false,
      width: isOnReducedSpaceLayout ? 'auto' : '120px',
      css: { justifyContent: 'flex-end' as const }, // right alignment
    },
    {
      name: '',
      actions,
      'data-test-subj': 'actions',
      width: isOnReducedSpaceLayout ? 'auto' : '60px',
    },
  ];

  // I need to swap the elements here to get the desired design
  return isOnReducedSpaceLayout ? swapArrayElements(columnsArray, 1, 2) : columnsArray;
};

export function QueryHistory({
  containerCSS,
  containerWidth,
  refetchHistoryItems,
  onUpdateAndSubmit,
  isInCompactMode,
}: {
  containerCSS: Interpolation<Theme>;
  containerWidth: number;
  onUpdateAndSubmit: (qs: string) => void;
  refetchHistoryItems?: boolean;
  isInCompactMode?: boolean;
}) {
  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);

  useEffect(() => {
    if (refetchHistoryItems) {
      // get history items from local storage
      setHistoryItems(getHistoryItems(sortDirection));
    }
  }, [refetchHistoryItems, sortDirection]);

  const actions: Array<CustomItemAction<QueryHistoryItem>> = useMemo(() => {
    return [
      {
        render: (item: QueryHistoryItem) => {
          return (
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'textBasedEditor.query.textBasedLanguagesEditor.querieshistoryRun',
                    {
                      defaultMessage: 'Run query',
                    }
                  )}
                >
                  <EuiButtonIcon
                    iconType="play"
                    aria-label={i18n.translate(
                      'textBasedEditor.query.textBasedLanguagesEditor.querieshistoryRun',
                      {
                        defaultMessage: 'Run query',
                      }
                    )}
                    data-test-subj="TextBasedLangEditor-queryHistory-runQuery-button"
                    role="button"
                    iconSize="m"
                    onClick={() => onUpdateAndSubmit(item.queryString)}
                    css={css`
                      cursor: pointer;
                    `}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy
                  textToCopy={item.queryString}
                  content={i18n.translate(
                    'textBasedEditor.query.textBasedLanguagesEditor.querieshistoryCopy',
                    {
                      defaultMessage: 'Copy query to clipboard',
                    }
                  )}
                >
                  {(copy) => (
                    <EuiButtonIcon
                      iconType="copyClipboard"
                      iconSize="m"
                      onClick={copy}
                      css={css`
                        cursor: pointer;
                      `}
                      aria-label={i18n.translate(
                        'textBasedEditor.query.textBasedLanguagesEditor.querieshistoryCopy',
                        {
                          defaultMessage: 'Copy query to clipboard',
                        }
                      )}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
  }, [onUpdateAndSubmit]);
  const isOnReducedSpaceLayout = containerWidth < 560;
  const columns = useMemo(() => {
    return getTableColumns(containerWidth, isOnReducedSpaceLayout, actions);
  }, [actions, containerWidth, isOnReducedSpaceLayout]);

  const onTableChange = ({ page, sort }: Criteria<QueryHistoryItem>) => {
    if (sort) {
      const { direction } = sort;
      setSortDirection(direction);
    }
  };

  const sorting = {
    sort: {
      field: 'timeRan',
      direction: sortDirection,
    },
  };
  const { euiTheme } = theme;
  const extraStyling = isOnReducedSpaceLayout
    ? getReducedSpaceStyling()
    : `width: ${containerWidth}px`;
  const tableStyling = css`
    .euiTable {
      background-color: ${euiTheme.colors.lightestShade};
    }
    .euiTable tbody tr:nth-child(odd) {
      background-color: ${euiTheme.colors.lightestShade};
      filter: brightness(97%);
    }
    .euiTableRowCell {
      vertical-align: top;
      border: none;
    }
    .euiTable th[data-test-subj='tableHeaderCell_duration_3'] span {
      justify-content: flex-end;
    }
    max-height: ${isInCompactMode ? CONTAINER_MAX_HEIGHT_COMPACT : CONTAINER_MAX_HEIGHT_EXPANDED}px;
    overflow-y: auto;
    ${scrollBarStyles}
    ${extraStyling}
  `;

  return (
    <div data-test-subj="TextBasedLangEditor-queryHistory" css={containerCSS}>
      <EuiInMemoryTable
        tableCaption={i18n.translate(
          'textBasedEditor.query.textBasedLanguagesEditor.querieshistoryTable',
          {
            defaultMessage: 'Queries history table',
          }
        )}
        responsive={false}
        items={historyItems}
        columns={columns}
        sorting={sorting}
        onChange={onTableChange}
        css={tableStyling}
        tableLayout={containerWidth < 560 ? 'auto' : 'fixed'}
      />
    </div>
  );
}

export function QueryColumn({
  queryString,
  containerWidth,
  isOnReducedSpaceLayout,
}: {
  containerWidth: number;
  queryString: string;
  isOnReducedSpaceLayout: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLElement>(null);

  const [isExpandable, setIsExpandable] = useState(false);
  const [isRowExpanded, setIsRowExpanded] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const textIsOverlapping = containerRef.current.offsetWidth < containerRef.current.scrollWidth;
      setIsExpandable(textIsOverlapping);
    }
  }, [containerWidth]);

  return (
    <>
      {isExpandable && (
        <EuiButtonIcon
          onClick={() => {
            setIsRowExpanded(!isRowExpanded);
          }}
          data-test-subj="TextBasedLangEditor-queryHistory-queryString-expanded"
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
          color="text"
        />
      )}
      <span
        css={css`
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: ${isRowExpanded ? 'pre-wrap' : 'nowrap'};
          padding-left: ${isExpandable ? euiTheme.size.s : euiTheme.size.m ? 0 : euiTheme.size.xl};
          color: ${isOnReducedSpaceLayout ? euiTheme.colors.subduedText : euiTheme.colors.text};
          font-size: ${isOnReducedSpaceLayout ? euiTheme.size.m : 'inherit'};
          font-family: ${euiTheme.font.familyCode};
          line-height: 1.5;
        `}
        ref={containerRef}
      >
        {queryString}
      </span>
    </>
  );
}
