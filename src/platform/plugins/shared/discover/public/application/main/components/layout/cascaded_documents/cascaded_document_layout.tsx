/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps, ComponentRef } from 'react';
import React, { useMemo, useCallback, Fragment, useRef, useState, useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import { EsqlQuery } from '@kbn/esql-language';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { getStatsCommandToOperateOn } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers/utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { throttle } from 'lodash';
import useLatest from 'react-use/lib/useLatest';
import {
  useEsqlDataCascadeRowHeaderComponents,
  useEsqlDataCascadeHeaderComponent,
  ESQLDataCascadeLeafCell,
  type ESQLDataGroupNode,
} from './blocks';
import { cascadedDocumentsStyles } from './cascaded_documents.styles';
import { useEsqlDataCascadeRowActionHelpers } from './blocks/use_row_header_components';
import { useDataCascadeRowExpansionHandlers, useGroupedCascadeData } from './hooks';
import {
  type DataCascadeUiState,
  useCascadedDocumentsContext,
} from './cascaded_documents_provider';

export interface ESQLDataCascadeProps
  extends Pick<
    UnifiedDataTableProps,
    | 'rows'
    | 'columns'
    | 'dataGridDensityState'
    | 'showTimeCol'
    | 'dataView'
    | 'showKeyboardShortcuts'
    | 'renderDocumentView'
    | 'externalCustomRenderers'
    | 'onUpdateDataGridDensity'
  > {
  togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'];
  queryMeta: ESQLStatsQueryMeta;
}

type EsqlDataCascade = typeof DataCascade<ESQLDataGroupNode>;

const ESQLDataCascade = React.memo(
  ({ rows, columns, dataView, togglePopover, queryMeta, ...props }: ESQLDataCascadeProps) => {
    const {
      availableCascadeGroups,
      selectedCascadeGroups,
      esqlVariables,
      viewModeToggle,
      getDataCascadeUiState,
      setDataCascadeUiState,
      cascadeGroupingChangeHandler,
    } = useCascadedDocumentsContext();

    const cascadeGroupData = useGroupedCascadeData({
      selectedCascadeGroups,
      rows,
      queryMeta,
      esqlVariables,
    });

    const {
      onCascadeGroupNodeExpanded,
      onCascadeGroupNodeCollapsed,
      onCascadeLeafNodeExpanded,
      onCascadeLeafNodeCollapsed,
    } = useDataCascadeRowExpansionHandlers({ dataView });

    const customTableHeading = useEsqlDataCascadeHeaderComponent({
      viewModeToggle,
      cascadeGroupingChangeHandler,
    });

    const { rowActions, rowHeaderMeta, rowHeaderTitle } = useEsqlDataCascadeRowHeaderComponents(
      queryMeta,
      columns,
      togglePopover
    );

    const cascadeLeafRowRenderer = useCallback<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']
    >(
      ({
        data: cellData,
        cellId,
        getScrollElement,
        getScrollOffset,
        getScrollMargin,
        preventSizeChangePropagation,
      }) => (
        <ESQLDataCascadeLeafCell
          {...props}
          dataView={dataView}
          cellData={cellData!}
          cellId={cellId}
          getScrollElement={getScrollElement}
          getScrollOffset={getScrollOffset}
          getScrollMargin={getScrollMargin}
          preventSizeChangePropagation={preventSizeChangePropagation}
        />
      ),
      [dataView, props]
    );

    const dataCascadeUiState = useMemo<DataCascadeUiState | undefined>(() => {
      const persistedCascadeUiState = getDataCascadeUiState();

      if (!persistedCascadeUiState) {
        return undefined;
      }

      // we need to verify that the rows persisted as "expanded" if any, are currently viable for rendering
      // for instance a user might have applied a filter that removed a row from the data set,
      // which the cascade component would not know about so in this scenario the current cascade ui state would be considered to be stale
      // till there's actual interaction with the table after the fact.
      // Here we leverage the visible rows for this check so we don't need to iterate over all rows in the data set.
      const visibleRowData = cascadeGroupData.slice(
        persistedCascadeUiState.range && Boolean(persistedCascadeUiState.range.endIndex)
          ? // in the event that the expanded row is the only visible group within the viewport
            // the start and end range index would have the same value,
            // so we subtract 1 from the end index to use as the start index,
            // in this scenario at most we run the check against 2 records
            Math.min(
              persistedCascadeUiState.range.startIndex,
              persistedCascadeUiState.range.endIndex - 1
            )
          : 0,
        persistedCascadeUiState.range?.endIndex
          ? persistedCascadeUiState.range.endIndex + 1
          : cascadeGroupData.length
      );

      const viableExpandedRows = Object.entries(persistedCascadeUiState.expanded ?? {}).reduce(
        (acc, [rowId, isExpanded]) => {
          if (visibleRowData.find((row) => row.id === rowId)) {
            acc[rowId] = isExpanded;
          }
          return acc;
        },
        {} as Exclude<DataCascadeUiState['expanded'], true>
      );

      return {
        ...persistedCascadeUiState,
        expanded: viableExpandedRows,
      };
    }, [getDataCascadeUiState, cascadeGroupData]);

    const initialTableState = useMemo<ComponentProps<EsqlDataCascade>['initialTableState']>(
      () => ({
        expanded: dataCascadeUiState?.expanded,
        rowSelection: dataCascadeUiState?.rowSelection,
      }),
      [dataCascadeUiState]
    );

    const latestSetDataCascadeUiState = useLatest(setDataCascadeUiState);
    const [dataCascadeRef, setDataCascadeRef] = useState<ComponentRef<EsqlDataCascade> | null>(
      null
    );

    useEffect(() => {
      const snapshotStore = dataCascadeRef?.getUISnapshotStore();

      if (!snapshotStore) {
        return;
      }

      const unsubscribeSnapshot = snapshotStore.subscribe(
        throttle(() => {
          latestSetDataCascadeUiState.current({ ...snapshotStore.getSnapshot() });
        }, 150)
      );

      return () => {
        unsubscribeSnapshot();
      };
    }, [dataCascadeRef, latestSetDataCascadeUiState]);

    return (
      <DataCascade<ESQLDataGroupNode>
        ref={setDataCascadeRef}
        size="s"
        overscan={25}
        data={cascadeGroupData}
        cascadeGroups={availableCascadeGroups}
        initialGroupColumn={selectedCascadeGroups}
        initialScrollOffset={dataCascadeUiState?.scrollOffset}
        initialTableState={initialTableState}
        initialRect={dataCascadeUiState?.scrollRect}
        customTableHeader={customTableHeading}
      >
        <DataCascadeRow<ESQLDataGroupNode, DataTableRecord>
          rowHeaderTitleSlot={rowHeaderTitle}
          rowHeaderMetaSlots={rowHeaderMeta}
          rowHeaderActions={rowActions}
          onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
          onCascadeGroupNodeCollapsed={onCascadeGroupNodeCollapsed}
        >
          <DataCascadeRowCell
            onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}
            onCascadeLeafNodeCollapsed={onCascadeLeafNodeCollapsed}
          >
            {cascadeLeafRowRenderer}
          </DataCascadeRowCell>
        </DataCascadeRow>
      </DataCascade>
    );
  }
);

export type CascadedDocumentsLayoutProps = Omit<
  ESQLDataCascadeProps,
  'togglePopover' | 'queryMeta'
>;

export const CascadedDocumentsLayout = React.memo(
  ({ dataView, ...props }: CascadedDocumentsLayoutProps) => {
    const { esqlQuery, esqlVariables, onUpdateESQLQuery, openInNewTab } =
      useCascadedDocumentsContext();
    const { euiTheme } = useEuiTheme();
    const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);

    const styles = useMemo(() => cascadedDocumentsStyles({ euiTheme }), [euiTheme]);

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta(esqlQuery.esql);
    }, [esqlQuery]);

    const statsCommandBeingOperatedOn = useMemo(() => {
      const parsedQuery = EsqlQuery.fromSrc(esqlQuery.esql);
      return getStatsCommandToOperateOn(parsedQuery);
    }, [esqlQuery]);

    const { renderRowActionPopover, togglePopover } = useEsqlDataCascadeRowActionHelpers({
      dataView,
      esqlVariables,
      editorQuery: esqlQuery,
      statsFieldSummary: statsCommandBeingOperatedOn?.grouping,
      updateESQLQuery: onUpdateESQLQuery,
      openInNewTab,
    });

    return (
      <div css={styles.wrapper} ref={cascadeWrapperRef}>
        <Fragment>{renderRowActionPopover(cascadeWrapperRef.current ?? undefined)}</Fragment>
        <ESQLDataCascade
          dataView={dataView}
          togglePopover={togglePopover}
          queryMeta={queryMeta}
          {...props}
        />
      </div>
    );
  }
);
