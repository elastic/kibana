/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiButtonIcon,
  CustomItemAction,
  EuiCopy,
  EuiToolTip,
  euiScrollBarStyles,
  EuiTab,
  EuiTabs,
  EuiNotificationBadge,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { cssFavoriteHoverWithinEuiTableRow } from '@kbn/content-management-favorites-public';
import { FAVORITES_LIMIT as ESQL_STARRED_QUERIES_LIMIT } from '@kbn/content-management-favorites-common';
import { css, Interpolation, Theme } from '@emotion/react';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import {
  type QueryHistoryItem,
  getHistoryItems,
  MAX_HISTORY_QUERIES_NUMBER,
  dateFormat,
} from '../history_local_storage';
import type { ESQLEditorDeps } from '../types';
import { getReducedSpaceStyling, swapArrayElements } from './history_starred_queries_helpers';
import { EsqlStarredQueriesService, StarredQueryItem } from './esql_starred_queries_service';
import { DiscardStarredQueryModal } from './discard_starred_query';

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
        <EuiFlexItem grow={false} data-test-subj="ESQLEditor-toggle-query-history-icon">
          <EuiToolTip
            position="top"
            content={
              isHistoryOpen
                ? i18n.translate('esqlEditor.query.hideQueriesLabel', {
                    defaultMessage: 'Hide recent queries',
                  })
                : i18n.translate('esqlEditor.query.showQueriesLabel', {
                    defaultMessage: 'Show recent queries',
                  })
            }
          >
            <EuiIcon
              type="clockCounter"
              color="primary"
              size="m"
              onClick={toggleHistory}
              css={css`
                margin-right: ${euiTheme.size.s};
                cursor: pointer;
              `}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <EuiFlexItem grow={false} data-test-subj="ESQLEditor-toggle-query-history-button-container">
          <EuiButtonEmpty
            size="xs"
            color="primary"
            onClick={toggleHistory}
            css={css`
              padding-inline: 0;
            `}
            iconType="clockCounter"
            data-test-subj="ESQLEditor-toggle-query-history-button"
          >
            {isHistoryOpen
              ? i18n.translate('esqlEditor.query.hideQueriesLabel', {
                  defaultMessage: 'Hide recent queries',
                })
              : i18n.translate('esqlEditor.query.showQueriesLabel', {
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
  actions: Array<CustomItemAction<QueryHistoryItem>>,
  isStarredTab = false,
  starredQueriesService?: EsqlStarredQueriesService
): Array<EuiBasicTableColumn<QueryHistoryItem>> => {
  const columnsArray = [
    {
      'data-test-subj': 'favoriteBtn',
      render: (item: QueryHistoryItem) => {
        const StarredQueryButton = starredQueriesService?.renderStarredButton(item);
        if (!StarredQueryButton) {
          return null;
        }
        return StarredQueryButton;
      },
      width: isOnReducedSpaceLayout ? 'auto' : '40px',
    },
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
                content={i18n.translate('esqlEditor.query.querieshistory.success', {
                  defaultMessage: 'Query ran successfully',
                })}
              >
                <EuiIcon
                  type="checkInCircleFilled"
                  color="success"
                  size="m"
                  data-test-subj="ESQLEditor-queryHistory-success"
                />
              </EuiToolTip>
            );
          case 'error':
            return (
              <EuiToolTip
                position="top"
                content={i18n.translate('esqlEditor.query.querieshistory.error', {
                  defaultMessage: 'Query failed',
                })}
              >
                <EuiIcon
                  type="error"
                  color="danger"
                  size="m"
                  data-test-subj="ESQLEditor-queryHistory-error"
                />
              </EuiToolTip>
            );
          case 'warning':
            return (
              <EuiToolTip
                position="top"
                content={i18n.translate('esqlEditor.query.querieshistory.error', {
                  defaultMessage: 'Query failed',
                })}
              >
                <EuiIcon
                  type="warning"
                  color="warning"
                  size="m"
                  data-test-subj="ESQLEditor-queryHistory-warning"
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
      name: i18n.translate('esqlEditor.query.recentQueriesColumnLabel', {
        defaultMessage: 'Query',
      }),
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
      name: isStarredTab
        ? i18n.translate('esqlEditor.query.dateAddedColumnLabel', {
            defaultMessage: 'Date Added',
          })
        : i18n.translate('esqlEditor.query.timeRanColumnLabel', {
            defaultMessage: 'Time ran',
          }),
      sortable: true,
      render: (timeRan: QueryHistoryItem['timeRan']) => moment(timeRan).format(dateFormat),
      width: isOnReducedSpaceLayout ? 'auto' : '240px',
    },
    {
      name: '',
      actions,
      'data-test-subj': 'actions',
      width: isOnReducedSpaceLayout ? 'auto' : '60px',
    },
  ];

  // I need to swap the elements here to get the desired design
  return isOnReducedSpaceLayout ? swapArrayElements(columnsArray, 2, 3) : columnsArray;
};

export function QueryList({
  containerCSS,
  containerWidth,
  onUpdateAndSubmit,
  height,
  listItems,
  starredQueriesService,
  tableCaption,
  dataTestSubj,
  isStarredTab = false,
}: {
  listItems: QueryHistoryItem[];
  containerCSS: Interpolation<Theme>;
  containerWidth: number;
  onUpdateAndSubmit: (qs: string) => void;
  height: number;
  starredQueriesService?: EsqlStarredQueriesService;
  tableCaption?: string;
  dataTestSubj?: string;
  isStarredTab?: boolean;
}) {
  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);
  const [isDiscardQueryModalVisible, setIsDiscardQueryModalVisible] = useState(false);

  const { sorting, onTableChange } = useEuiTablePersist<QueryHistoryItem>({
    tableId: 'esqlQueryHistory',
    initialSort: {
      field: 'timeRan',
      direction: 'desc',
    },
  });

  const actions: Array<CustomItemAction<QueryHistoryItem>> = useMemo(() => {
    return [
      {
        render: (item: QueryHistoryItem) => {
          return (
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate('esqlEditor.query.esqlQueriesListRun', {
                    defaultMessage: 'Run query',
                  })}
                >
                  <EuiButtonIcon
                    iconType="play"
                    aria-label={i18n.translate('esqlEditor.query.esqlQueriesListRun', {
                      defaultMessage: 'Run query',
                    })}
                    data-test-subj="ESQLEditor-history-starred-queries-run-button"
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
                  content={i18n.translate('esqlEditor.query.esqlQueriesCopy', {
                    defaultMessage: 'Copy query to clipboard',
                  })}
                >
                  {(copy) => (
                    <EuiButtonIcon
                      iconType="copyClipboard"
                      iconSize="m"
                      onClick={copy}
                      css={css`
                        cursor: pointer;
                      `}
                      aria-label={i18n.translate('esqlEditor.query.esqlQueriesCopy', {
                        defaultMessage: 'Copy query to clipboard',
                      })}
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
    return getTableColumns(
      containerWidth,
      isOnReducedSpaceLayout,
      actions,
      isStarredTab,
      starredQueriesService
    );
  }, [containerWidth, isOnReducedSpaceLayout, actions, isStarredTab, starredQueriesService]);

  const { euiTheme } = theme;
  const extraStyling = isOnReducedSpaceLayout ? getReducedSpaceStyling() : '';

  const starredQueriesCellStyling = cssFavoriteHoverWithinEuiTableRow(theme.euiTheme);

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
    border-bottom-left-radius: ${euiTheme.border.radius.medium};
    border-top-left-radius: ${euiTheme.border.radius.medium};
    max-height: ${height}px;
    overflow-y: auto;
    ${scrollBarStyles}
    ${extraStyling}
    ${starredQueriesCellStyling}
  `;

  starredQueriesService?.discardModalVisibility$.subscribe((nextVisibility) => {
    if (isDiscardQueryModalVisible !== nextVisibility) {
      setIsDiscardQueryModalVisible(nextVisibility);
    }
  });

  return (
    <div data-test-subj={dataTestSubj ?? 'ESQLEditor-queryList'} css={containerCSS}>
      <EuiInMemoryTable
        tableCaption={
          tableCaption ||
          i18n.translate('esqlEditor.query.queriesListTable', {
            defaultMessage: 'ES|QL Queries table',
          })
        }
        responsiveBreakpoint={false}
        items={listItems}
        columns={columns}
        sorting={sorting}
        onChange={onTableChange}
        css={tableStyling}
        tableLayout={containerWidth < 560 ? 'auto' : 'fixed'}
      />
      {isDiscardQueryModalVisible && (
        <DiscardStarredQueryModal
          onClose={async (dismissFlag, removeQuery) =>
            (await starredQueriesService?.onDiscardModalClose(dismissFlag, removeQuery)) ??
            Promise.resolve()
          }
        />
      )}
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
          data-test-subj="ESQLEditor-queryList-queryString-expanded"
          aria-label={
            isRowExpanded
              ? i18n.translate('esqlEditor.query.collapseLabel', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('esqlEditor.query.expandLabel', {
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

export function HistoryAndStarredQueriesTabs({
  containerCSS,
  containerWidth,
  onUpdateAndSubmit,
  height,
}: {
  containerCSS: Interpolation<Theme>;
  containerWidth: number;
  onUpdateAndSubmit: (qs: string) => void;
  height: number;
}) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { core, usageCollection, storage } = kibana.services;

  const [starredQueriesService, setStarredQueriesService] = useState<EsqlStarredQueriesService>();
  const [starredQueries, setStarredQueries] = useState<StarredQueryItem[]>([]);

  useEffect(() => {
    const initializeService = async () => {
      const starredService = await EsqlStarredQueriesService.initialize({
        http: core.http,
        usageCollection,
        storage,
      });
      setStarredQueriesService(starredService);
    };
    if (!starredQueriesService) {
      initializeService();
    }
  }, [core.http, starredQueriesService, storage, usageCollection]);

  starredQueriesService?.queries$.subscribe((nextQueries) => {
    if (nextQueries.length !== starredQueries.length) {
      setStarredQueries(nextQueries);
    }
  });

  const { euiTheme } = useEuiTheme();
  const tabs = useMemo(() => {
    return [
      {
        id: 'history-queries-tab',
        name: i18n.translate('esqlEditor.query.historyQueriesTabLabel', {
          defaultMessage: 'Recent',
        }),
        dataTestSubj: 'history-queries-tab',
        content: (
          <QueryList
            containerCSS={containerCSS}
            onUpdateAndSubmit={onUpdateAndSubmit}
            containerWidth={containerWidth}
            height={height}
            listItems={getHistoryItems('desc')}
            dataTestSubj="ESQLEditor-queryHistory"
            tableCaption={i18n.translate('esqlEditor.query.querieshistoryTable', {
              defaultMessage: 'Queries history table',
            })}
            starredQueriesService={starredQueriesService}
          />
        ),
      },
      {
        id: 'starred-queries-tab',
        dataTestSubj: 'starred-queries-tab',
        name: i18n.translate('esqlEditor.query.starredQueriesTabLabel', {
          defaultMessage: 'Starred',
        }),
        append: (
          <EuiNotificationBadge className="eui-alignCenter" size="m" color="subdued">
            {starredQueries?.length}
          </EuiNotificationBadge>
        ),
        content: (
          <QueryList
            containerCSS={containerCSS}
            onUpdateAndSubmit={onUpdateAndSubmit}
            containerWidth={containerWidth}
            height={height}
            listItems={starredQueries}
            dataTestSubj="ESQLEditor-starredQueries"
            tableCaption={i18n.translate('esqlEditor.query.starredQueriesTable', {
              defaultMessage: 'Starred queries table',
            })}
            starredQueriesService={starredQueriesService}
            isStarredTab={true}
          />
        ),
      },
    ];
  }, [
    containerCSS,
    containerWidth,
    height,
    onUpdateAndSubmit,
    starredQueries,
    starredQueriesService,
  ]);

  const [selectedTabId, setSelectedTabId] = useState('history-queries-tab');
  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        append={tab.append}
        data-test-subj={tab.dataTestSubj}
      >
        {tab.name}
      </EuiTab>
    ));
  }, [selectedTabId, tabs]);

  return (
    <>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
        css={css`
          background-color: ${euiTheme.colors.lightestShade};
          padding-left: ${euiTheme.size.s};
          padding-right: ${euiTheme.size.s};
          border-block-end: ${euiTheme.border.thin};
        `}
      >
        <EuiTabs bottomBorder={false} size="s">
          {renderTabs()}
        </EuiTabs>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj="ESQLEditor-history-starred-queries-helpText"
            >
              <p>
                {selectedTabId === 'history-queries-tab'
                  ? i18n.translate('esqlEditor.history.historyItemslimit', {
                      defaultMessage: 'Showing last {historyItemsLimit} queries',
                      values: { historyItemsLimit: MAX_HISTORY_QUERIES_NUMBER },
                    })
                  : i18n.translate('esqlEditor.history.starredItemslimit', {
                      defaultMessage:
                        'Showing {starredItemsCount} queries (max {starredItemsLimit})',
                      values: {
                        starredItemsLimit: ESQL_STARRED_QUERIES_LIMIT,
                        starredItemsCount: starredQueries.length ?? 0,
                      },
                    })}
              </p>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedTabContent}
    </>
  );
}
