/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import { type AggregateQuery } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import type { ISearchGeneric } from '@kbn/search-types';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  appendFilteringWhereClauseForCascadeLayout,
  constructCascadeQuery,
  GROUP_NOT_SET_VALUE,
} from '@kbn/esql-utils';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiWrappingPopover,
  copyToClipboard,
} from '@elastic/eui';
import { NumberBadge, type DataCascadeRowProps } from '@kbn/shared-ux-document-data-cascade';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { StatsCommandSummary } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers/utils';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils';
import {
  type SupportedStatsFunction,
  getStatsGroupFieldType,
  getFieldParamDefinition,
} from '@kbn/esql-utils/src/utils/cascaded_documents_helpers/utils';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldTerminals } from '@kbn/esql-utils/src/utils/esql_fields_utils';
import { getSparklineCellRenderer } from '../../../../../../context_awareness/profile_providers/common/patterns_data_source_profile/sparkline_cell_renderer';
import { type UpdateESQLQueryFn, useProfileAccessor } from '../../../../../../context_awareness';
import { useCascadedDocumentsContext } from '../cascaded_documents_provider';
import { getPatternCellRenderer } from '../../../../../../context_awareness/profile_providers/common/patterns_data_source_profile/pattern_cell_renderer';
import type { ESQLDataGroupNode } from './types';
import type { internalStateActions } from '../../../../state_management/redux';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';

interface RowContext {
  groupId: string;
  groupValue: string;
}

interface RowClickActionContext {
  dataView: DataView;
  editorQuery: AggregateQuery;
  statsFieldSummary: StatsCommandSummary['grouping'] | undefined;
  esqlVariables: ESQLControlVariable[] | undefined;
  rowContext: RowContext;
  closeActionMenu: () => void;
  openInNewTab: (...args: Parameters<typeof internalStateActions.openInNewTab>) => void;
  updateESQLQuery: UpdateESQLQueryFn;
}

/**
 * Defines the context menu actions for the row header.
 */
const contextRowActions: Array<
  EuiContextMenuPanelItemDescriptorEntry & {
    /**
     * The stats function type to render the action for. If not provided, the action will be rendered for all stats function types.
     */
    renderFor?: SupportedStatsFunction;
    /**
     * Allows an action to be enabled when the field is filterable.
     */
    enabledWhenFilterable?: boolean;
  }
> = [
  {
    name: i18n.translate('discover.dataCascade.row.action.copyToClipboard', {
      defaultMessage: 'Copy to clipboard',
    }),
    icon: 'copy',
    'data-test-subj': 'dscCascadeRowContextActionCopyToClipboard',
    onClick(this: RowClickActionContext) {
      copyToClipboard(this.rowContext.groupValue);
      return this.closeActionMenu();
    },
  },
  {
    enabledWhenFilterable: true,
    name: i18n.translate('discover.dataCascade.row.action.filterIn', {
      defaultMessage: 'Filter in',
    }),
    icon: 'plusCircle',
    'data-test-subj': 'dscCascadeRowContextActionFilterIn',
    onClick(this: RowClickActionContext) {
      const updatedQuery = appendFilteringWhereClauseForCascadeLayout(
        this.editorQuery.esql,
        this.esqlVariables,
        this.dataView,
        this.rowContext.groupId,
        this.rowContext.groupValue,
        this.rowContext.groupValue === GROUP_NOT_SET_VALUE ? 'is_null' : '+'
      );

      if (!updatedQuery) {
        return;
      }

      this.updateESQLQuery(updatedQuery);

      return this.closeActionMenu();
    },
  },
  {
    enabledWhenFilterable: true,
    name: i18n.translate('discover.dataCascade.row.action.filterOut', {
      defaultMessage: 'Filter out',
    }),
    icon: 'minusCircle',
    'data-test-subj': 'dscCascadeRowContextActionFilterOut',
    onClick(this: RowClickActionContext) {
      const updatedQuery = appendFilteringWhereClauseForCascadeLayout(
        this.editorQuery.esql,
        this.esqlVariables,
        this.dataView,
        this.rowContext.groupId,
        this.rowContext.groupValue,
        this.rowContext.groupValue === GROUP_NOT_SET_VALUE ? 'is_not_null' : '-'
      );

      if (!updatedQuery) {
        return;
      }

      this.updateESQLQuery(updatedQuery);
      return this.closeActionMenu();
    },
  },
  {
    name: i18n.translate('discover.dataCascade.row.action.viewDocs', {
      defaultMessage: 'Open in new tab',
    }),
    icon: 'discoverApp',
    'data-test-subj': 'dscCascadeRowContextActionOpenInNewTab',
    onClick(this: RowClickActionContext, e) {
      e.preventDefault();

      return this.openInNewTab({
        appState: {
          query: constructCascadeQuery({
            query: this.editorQuery,
            dataView: this.dataView,
            esqlVariables: this.esqlVariables,
            nodeType: 'leaf',
            nodePath: [this.rowContext.groupId],
            nodePathMap: { [this.rowContext.groupId]: this.rowContext.groupValue },
          }),
        },
      });
    },
  },
];

interface ContextMenuProps
  extends Pick<
    RowClickActionContext,
    | 'editorQuery'
    | 'openInNewTab'
    | 'dataView'
    | 'esqlVariables'
    | 'statsFieldSummary'
    | 'updateESQLQuery'
  > {
  row: RowContext;
  close: RowClickActionContext['closeActionMenu'];
}

const ContextMenu = React.memo(
  ({
    row,
    editorQuery,
    statsFieldSummary,
    esqlVariables,
    dataView,
    close,
    openInNewTab,
    updateESQLQuery,
  }: ContextMenuProps) => {
    const rowStatsFieldSummary = useMemo(() => {
      return statsFieldSummary?.[row.groupId];
    }, [statsFieldSummary, row.groupId]);

    const groupType = rowStatsFieldSummary
      ? getStatsGroupFieldType(rowStatsFieldSummary)
      : undefined;

    const rowDataViewField = useMemo(() => {
      const fieldParamDef = getFieldParamDefinition(
        row.groupId,
        rowStatsFieldSummary?.arg ? getFieldTerminals(rowStatsFieldSummary.arg) : [],
        esqlVariables
      );

      if (typeof fieldParamDef !== 'string') {
        return undefined;
      }

      return dataView.fields.getByName(fieldParamDef ?? row.groupId);
    }, [dataView.fields, esqlVariables, row.groupId, rowStatsFieldSummary?.arg]);

    const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
      return [
        {
          id: `${row.groupId}-${row.groupValue}-context-menu`,
          items: contextRowActions.reduce(
            (acc, { renderFor, enabledWhenFilterable, ...action }) => {
              if (renderFor && renderFor !== groupType) {
                return acc;
              }

              return acc.concat({
                ...action,
                disabled:
                  (enabledWhenFilterable === true &&
                    rowDataViewField &&
                    !rowDataViewField?.filterable) ||
                  !row.groupValue,
                onClick: action.onClick?.bind({
                  rowContext: row,
                  editorQuery,
                  esqlVariables,
                  dataView,
                  closeActionMenu: close,
                  openInNewTab,
                  updateESQLQuery,
                }),
              });
            },
            [] as Array<EuiContextMenuPanelItemDescriptor>
          ),
        },
      ];
    }, [
      close,
      dataView,
      editorQuery,
      esqlVariables,
      groupType,
      openInNewTab,
      row,
      rowDataViewField,
      updateESQLQuery,
    ]);

    return (
      <EuiContextMenu
        data-test-subj="dscCascadeRowContextActionMenu"
        initialPanelId={panels[0].id}
        panels={panels}
      />
    );
  }
);

export const useEsqlDataCascadeRowActionHelpers = ({
  dataView,
  esqlVariables,
  editorQuery,
  statsFieldSummary,
  updateESQLQuery,
  openInNewTab,
}: Pick<
  ContextMenuProps,
  | 'dataView'
  | 'esqlVariables'
  | 'editorQuery'
  | 'statsFieldSummary'
  | 'updateESQLQuery'
  | 'openInNewTab'
>) => {
  const popoverRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRowData, setPopoverRowData] = useState<RowContext | null>(null);
  const closePopover = useCallback(() => setPopoverRowData(null), [setPopoverRowData]);

  /**
   * Helper function to toggle the popover for the row action (3 dots) button.
   */
  const togglePopover = useCallback(
    function (this: RowContext, e: React.MouseEvent<Element>) {
      setPopoverRowData((prev) => {
        if (prev?.groupValue === this.groupValue) {
          popoverRef.current = null;
          return null;
        }

        popoverRef.current = e.currentTarget as HTMLButtonElement;
        return this;
      });
    },
    [setPopoverRowData]
  );

  /**
   * Renders the popover for the row action (3 dots) button.
   * Adopting this pattern avoids rendering multiple popovers
   * in the table which can be very expensive.
   *
   * Note: The popover content is re-created each
   * time it is opened to ensure the context actions have access to the
   * latest props and state.
   */
  const renderRowActionPopover = useCallback(
    (container?: HTMLElement) => {
      return popoverRowData ? (
        <EuiWrappingPopover
          button={popoverRef.current!}
          isOpen={popoverRowData !== null}
          closePopover={() => setPopoverRowData(null)}
          panelPaddingSize="none"
          anchorPosition="upLeft"
          container={container}
          aria-label={i18n.translate('discover.dataCascade.rowActions.popoverAriaLabel', {
            defaultMessage: 'Row actions',
          })}
        >
          <ContextMenu
            close={closePopover}
            editorQuery={editorQuery}
            esqlVariables={esqlVariables}
            row={popoverRowData}
            dataView={dataView}
            statsFieldSummary={statsFieldSummary}
            openInNewTab={openInNewTab}
            updateESQLQuery={updateESQLQuery}
          />
        </EuiWrappingPopover>
      ) : null;
    },
    [
      closePopover,
      dataView,
      editorQuery,
      esqlVariables,
      openInNewTab,
      popoverRowData,
      statsFieldSummary,
      updateESQLQuery,
    ]
  );

  return {
    renderRowActionPopover,
    togglePopover,
  };
};

const rowHeaderTitleStyles = {
  textWrapper: css({
    minWidth: 0,
    textWrap: 'nowrap',
  }),
  textInner: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    lineClamp: 2,
  }),
};

const textSlotStyles = css({
  width: '20ch',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const NO_VALUE_PLACEHOLDER = i18n.translate('discover.dataCascade.row.action.noValue', {
  defaultMessage: '(blank)',
});

export function useEsqlDataCascadeRowHeaderComponents(
  editorQueryMeta: ESQLStatsQueryMeta,
  selectedColumns: string[],
  togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'],
  columnTypes: Map<string, 'number' | 'array'>
) {
  const services = useDiscoverServices();
  const { esqlQuery, timeRange } = useCascadedDocumentsContext();
  const getGroupRowMetaSlotsAccessor = useProfileAccessor('getGroupRowMetaSlots');
  const getGroupRowEnrichmentQueryAccessor = useProfileAccessor('getGroupRowEnrichmentQuery');

  const groupByField = editorQueryMeta.groupByFields[0]?.field;

  const enrichmentQueryStr = useMemo(() => {
    if (!groupByField) return undefined;
    return getGroupRowEnrichmentQueryAccessor(() => undefined)({ query: esqlQuery, groupByField });
  }, [getGroupRowEnrichmentQueryAccessor, esqlQuery, groupByField]);

  const [enrichmentData, setEnrichmentData] = useState<
    Map<string, Record<string, unknown>> | undefined
  >(undefined);

  useEffect(() => {
    if (!enrichmentQueryStr || !groupByField) {
      setEnrichmentData(undefined);
      return;
    }

    const abortController = new AbortController();

    getESQLResults({
      esqlQuery: enrichmentQueryStr,
      search: services.data.search.search as ISearchGeneric,
      timeRange: timeRange ?? undefined,
      signal: abortController.signal,
    })
      .then(({ response }) => {
        const columnNames = response.columns.map((c) => c.name);
        const map = new Map<string, Record<string, unknown>>();
        response.values.forEach((row) => {
          const record: Record<string, unknown> = {};
          columnNames.forEach((col, i) => {
            record[col] = row[i];
          });
          const key = String(record[groupByField] ?? '');
          map.set(key, record);
        });
        setEnrichmentData(map);
      })
      .catch(() => {
        setEnrichmentData(undefined);
      });

    return () => {
      abortController.abort();
    };
  }, [enrichmentQueryStr, timeRange, groupByField, services]);

  const aggregateColumnIdentifiers = useMemo(() => {
    return new Set(editorQueryMeta.appliedFunctions.map(({ identifier }) => identifier));
  }, [editorQueryMeta.appliedFunctions]);

  /**
   * Renders the title part of the row header.
   */
  const rowHeaderTitle = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderTitleSlot']>
  >(
    ({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];
      const type = editorQueryMeta.groupByFields.find((field) => field.field === rowGroup)?.type;

      if (type && /categorize/i.test(type)) {
        return (
          <div data-test-subj={`${rowData.id}-dscCascadeRowTitlePatternCellRenderer`}>
            {getPatternCellRenderer(rowData.groupValue, false)}
          </div>
        );
      }

      return (
        <EuiText size="s">
          <h4 css={rowHeaderTitleStyles.textInner}>
            {rowData.groupValue ||
              i18n.translate('discover.dataCascade.row.action.noValue', {
                defaultMessage: '(blank)',
              })}
          </h4>
        </EuiText>
      );
    },
    [editorQueryMeta.groupByFields]
  );

  /**
   * Renders the meta part of the row header.
   */
  const rowHeaderMeta = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderMetaSlots']>
  >(
    ({ rowData, nodePath }) => {
      const groupField = nodePath[nodePath.length - 1];
      const groupValue = rowData.groupValue;

      const profileSlots = getGroupRowMetaSlotsAccessor(() => undefined)({
        groupField,
        groupValue,
        aggregatedValues: rowData.aggregatedValues as Record<string, unknown>,
        selectedColumns,
        columnTypes,
        appliedFunctions: editorQueryMeta.appliedFunctions,
        query: esqlQuery,
        timeRange,
        charts: services.charts,
        enrichmentData,
      });

      if (profileSlots !== undefined) {
        return profileSlots;
      }

      return selectedColumns
        .map((selectedColumn) => {
          if (!aggregateColumnIdentifiers.has(selectedColumn)) {
            return null;
          }

          const aggregatedValue = rowData.aggregatedValues[selectedColumn];
          const isArrayType =
            Array.isArray(aggregatedValue) ||
            (aggregatedValue === undefined && columnTypes.get(selectedColumn) === 'array');

          const aggregation = editorQueryMeta.appliedFunctions.find(
            ({ identifier }) => identifier === selectedColumn
          )?.aggregation;

          if (aggregation && /sparkline/i.test(aggregation) && isArrayType) {
            return (
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false} css={rowHeaderTitleStyles.textWrapper}>
                  <span css={rowHeaderTitleStyles.textInner}>{selectedColumn}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div css={css({ width: '100px' })}>
                    {getSparklineCellRenderer(services.charts, aggregatedValue, false, undefined)}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          return (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <FormattedMessage
                id="discover.dataCascade.grouping.function"
                defaultMessage="<bold>{selectedColumn}:</bold> <badge></badge>"
                values={{
                  selectedColumn,
                  bold: (chunks) => (
                    <EuiFlexItem grow={false} css={rowHeaderTitleStyles.textWrapper}>
                      <span css={rowHeaderTitleStyles.textInner}>{chunks}</span>
                    </EuiFlexItem>
                  ),
                  badge: () => {
                    if (isArrayType) {
                      return (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow" css={textSlotStyles}>
                            {Array.isArray(aggregatedValue)
                              ? aggregatedValue
                                  .map((value) => value || NO_VALUE_PLACEHOLDER)
                                  .join(', ')
                              : '-'}
                          </EuiBadge>
                        </EuiFlexItem>
                      );
                    }

                    return (
                      <EuiFlexItem grow={false}>
                        <NumberBadge value={Number(aggregatedValue)} shortenAtExpSize={3} />
                      </EuiFlexItem>
                    );
                  },
                }}
              />
            </EuiFlexGroup>
          );
        })
        .filter(Boolean);
    },
    [
      aggregateColumnIdentifiers,
      columnTypes,
      editorQueryMeta,
      enrichmentData,
      esqlQuery,
      getGroupRowMetaSlotsAccessor,
      selectedColumns,
      services,
      timeRange,
    ]
  );

  const rowActions = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderActions']>
  >(
    ({ rowData, nodePath }) => {
      const groupId = nodePath[nodePath.length - 1];
      const groupValue = rowData.groupValue;

      return [
        {
          iconType: 'boxesVertical',
          'aria-label': `${rowData.id}-cascade-row-actions`,
          'data-test-subj': `${rowData.id}-dscCascadeRowContextActionButton`,
          onClick: togglePopover?.bind({ groupId, groupValue }),
        },
      ];
    },
    [togglePopover]
  );

  return useMemo(
    () => ({
      rowHeaderMeta,
      rowHeaderTitle,
      rowActions,
    }),
    [rowActions, rowHeaderMeta, rowHeaderTitle]
  );
}
