/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MouseEventHandler } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import { type AggregateQuery } from '@kbn/es-query';
import { appendFilteringWhereClauseForCascadeLayout, constructCascadeQuery } from '@kbn/esql-utils';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextTruncate,
  EuiWrappingPopover,
  copyToClipboard,
} from '@elastic/eui';
import { NumberBadge, type DataCascadeRowProps } from '@kbn/shared-ux-document-data-cascade';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import {
  type ESQLStatsQueryMeta,
  type SupportedStatsFunction,
  getStatsGroupFieldType,
  getFieldParamDefinition,
} from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { StatsCommandSummary } from '@kbn/esql-ast/src/mutate/commands/stats';
import { getPatternCellRenderer } from '../../../../../../context_awareness/profile_providers/common/patterns_data_source_profile/pattern_cell_renderer';

import type { ESQLDataGroupNode, DataTableRecord } from './types';
import {
  type TabStateGlobalState,
  internalStateActions,
  useInternalStateDispatch,
} from '../../../../state_management/redux';

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
  services: UnifiedDataTableProps['services'];
  closeActionMenu: () => void;
  globalState: TabStateGlobalState;
  openInNewTab: (...args: Parameters<typeof internalStateActions.openInNewTab>) => void;
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
    name: i18n.translate('discover.esql_data_cascade.row.action.copy_to_clipboard', {
      defaultMessage: 'Copy to clipboard',
    }),
    icon: 'copy',
    'data-test-subj': 'dscCascadeRowContextActionCopyToClipboard',
    onClick(this: RowClickActionContext) {
      copyToClipboard(this.rowContext.groupValue as string);
      this.closeActionMenu();
    },
  },
  {
    enabledWhenFilterable: true,
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_in', {
      defaultMessage: 'Filter in',
    }),
    icon: 'plusInCircle',
    'data-test-subj': 'dscCascadeRowContextActionFilterIn',
    onClick(this: RowClickActionContext) {
      const updatedQuery = appendFilteringWhereClauseForCascadeLayout(
        this.editorQuery.esql,
        this.esqlVariables,
        this.dataView,
        this.rowContext.groupId,
        this.rowContext.groupValue as string,
        '+'
      );

      if (!updatedQuery) {
        return;
      }

      this.services.data.query.queryString.setQuery({
        esql: updatedQuery,
      });
    },
  },
  {
    enabledWhenFilterable: true,
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_out', {
      defaultMessage: 'Filter out',
    }),
    icon: 'minusInCircle',
    'data-test-subj': 'dscCascadeRowContextActionFilterOut',
    onClick(this: RowClickActionContext) {
      const updatedQuery = appendFilteringWhereClauseForCascadeLayout(
        this.editorQuery.esql,
        this.esqlVariables,
        this.dataView,
        this.rowContext.groupId,
        this.rowContext.groupValue as string,
        '-'
      );

      if (!updatedQuery) {
        return;
      }

      this.services.data.query.queryString.setQuery({
        esql: updatedQuery,
      });
    },
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.view_docs', {
      defaultMessage: 'Open in new discover tab',
    }),
    icon: 'discoverApp',
    renderFor: 'categorize',
    'data-test-subj': 'dscCascadeRowContextActionOpenInNewTab',
    onClick(this: RowClickActionContext, e) {
      e.preventDefault();

      this.openInNewTab({
        globalState: this.globalState,
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
    | 'globalState'
    | 'openInNewTab'
    | 'dataView'
    | 'esqlVariables'
    | 'statsFieldSummary'
  > {
  row: RowContext;
  services: UnifiedDataTableProps['services'];
  close: RowClickActionContext['closeActionMenu'];
}

const ContextMenu = React.memo(
  ({
    row,
    services,
    editorQuery,
    statsFieldSummary,
    esqlVariables,
    dataView,
    close,
    globalState,
    openInNewTab,
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
        rowStatsFieldSummary?.terminals ?? [],
        esqlVariables
      );
      return dataView.fields.getByName(fieldParamDef ?? row.groupId);
    }, [dataView.fields, esqlVariables, row.groupId, rowStatsFieldSummary?.terminals]);

    const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
      return [
        {
          id: `${row.groupId}-${row.groupValue}-context-menu`,
          items: contextRowActions.reduce((acc, { renderFor, ...action }) => {
            if (renderFor && renderFor !== groupType) {
              return acc;
            }

            return acc.concat({
              ...action,
              disabled:
                (action.enabledWhenFilterable === true && !rowDataViewField?.filterable) ||
                !row.groupValue,
              onClick: (action.onClick as MouseEventHandler<Element>)?.bind({
                rowContext: row,
                services,
                editorQuery,
                esqlVariables,
                dataView,
                closeActionMenu: close,
                globalState,
                openInNewTab,
              }),
            });
          }, [] as Array<EuiContextMenuPanelItemDescriptor>),
        },
      ];
    }, [
      close,
      dataView,
      editorQuery,
      esqlVariables,
      globalState,
      groupType,
      openInNewTab,
      row,
      rowDataViewField?.filterable,
      services,
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

export const useEsqlDataCascadeRowActionHelpers = (
  dataView: DataView,
  esqlVariables: ESQLControlVariable[] | undefined,
  editorQuery: AggregateQuery,
  statsFieldSummary: StatsCommandSummary['grouping'] | undefined,
  globalState: TabStateGlobalState,
  services: UnifiedDataTableProps['services']
) => {
  const popoverRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRowData, setPopoverRowData] = useState<RowContext | null>(null);
  const dispatch = useInternalStateDispatch();
  const closePopover = useCallback(() => setPopoverRowData(null), [setPopoverRowData]);

  const openInNewTab = useCallback(
    (...args: Parameters<typeof internalStateActions.openInNewTab>) => {
      dispatch(internalStateActions.openInNewTab(...args));
    },
    [dispatch]
  );

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
        >
          <ContextMenu
            close={closePopover}
            editorQuery={editorQuery}
            esqlVariables={esqlVariables}
            globalState={globalState}
            row={popoverRowData!}
            services={services}
            dataView={dataView}
            statsFieldSummary={statsFieldSummary}
            openInNewTab={openInNewTab}
          />
        </EuiWrappingPopover>
      ) : null;
    },
    [
      popoverRowData,
      closePopover,
      editorQuery,
      esqlVariables,
      globalState,
      services,
      dataView,
      statsFieldSummary,
      openInNewTab,
    ]
  );

  return {
    renderRowActionPopover,
    togglePopover,
  };
};

const metaSlotStyles = {
  textWrapper: css({
    minWidth: 0,
    textWrap: 'nowrap',
  }),
  textInner: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
};

export function useEsqlDataCascadeRowHeaderComponents(
  editorQueryMeta: ESQLStatsQueryMeta,
  selectedColumns: string[],
  togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover']
) {
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
            {getPatternCellRenderer(
              // @ts-expect-error - necessary to match the data shape expectation
              { flattened: rowData },
              rowGroup,
              false
            )}
          </div>
        );
      }

      return (
        <EuiText size="s">
          <EuiTextTruncate
            text={
              (rowData[rowGroup] ??
                i18n.translate('discover.esql_data_cascade.row.action.no_value', {
                  defaultMessage: '(null)',
                })) as string
            }
          >
            {(truncatedText) => {
              return <h4>{truncatedText}</h4>;
            }}
          </EuiTextTruncate>
        </EuiText>
      );
    },
    [editorQueryMeta.groupByFields]
  );

  const namedColumnsFromQuery = useMemo(() => {
    return editorQueryMeta.appliedFunctions.map(({ identifier }) => identifier);
  }, [editorQueryMeta.appliedFunctions]);

  /**
   * Renders the meta part of the row header.
   */
  const rowHeaderMeta = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderMetaSlots']>
  >(
    ({ rowData }) =>
      selectedColumns
        .map((selectedColumn) => {
          if (namedColumnsFromQuery.indexOf(selectedColumn) < 0) {
            return null;
          }

          return (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <FormattedMessage
                id="discover.esql_data_cascade.grouping.function"
                defaultMessage="<bold>{selectedColumn}: </bold><badge>{selectedColumnValue}</badge>"
                values={{
                  selectedColumn,
                  selectedColumnValue: rowData[selectedColumn] as string | number,
                  bold: (chunks) => (
                    <EuiFlexItem grow={false} css={metaSlotStyles.textWrapper}>
                      <span css={metaSlotStyles.textInner}>{chunks}</span>
                    </EuiFlexItem>
                  ),
                  badge: ([chunk]) => {
                    return (
                      <EuiFlexItem grow={false}>
                        {Number.isNaN(Number(chunk)) ? (
                          <EuiBadge color="hollow">{chunk}</EuiBadge>
                        ) : (
                          <NumberBadge value={Number(chunk)} shortenAtExpSize={3} />
                        )}
                      </EuiFlexItem>
                    );
                  },
                }}
              />
            </EuiFlexGroup>
          );
        })
        .filter(Boolean),
    [namedColumnsFromQuery, selectedColumns]
  );

  const rowActions = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderActions']>
  >(
    ({ rowData, nodePath }) => {
      const groupId = nodePath[nodePath.length - 1];
      const groupValue = rowData[groupId] as string;

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
