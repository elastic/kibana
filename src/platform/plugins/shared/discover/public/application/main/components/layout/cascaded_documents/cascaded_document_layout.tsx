/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, Fragment, useRef, useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { throttle } from 'lodash';
import type { ExpandedState, RowSelectionState } from '@tanstack/react-table';
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
import {
  useEsqlDataCascadeRowHeaderComponents,
  useEsqlDataCascadeHeaderComponent,
  ESQLDataCascadeLeafCell,
  type ESQLDataGroupNode,
} from './blocks';
import { cascadedDocumentsStyles } from './cascaded_documents.styles';
import { useEsqlDataCascadeRowActionHelpers } from './blocks/use_row_header_components';
import { useDataCascadeRowExpansionHandlers, useGroupedCascadeData } from './hooks';
import { useCascadedDocumentsContext } from './cascaded_documents_provider';
import type { DataCascadeLeafUiState } from '../../../state_management/redux';

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

const ESQLDataCascade = React.memo(
  ({ rows, columns, dataView, togglePopover, queryMeta, ...props }: ESQLDataCascadeProps) => {
    const {
      availableCascadeGroups,
      selectedCascadeGroups,
      dataCascadeUiState,
      setDataCascadeUiState,
      esqlVariables,
      viewModeToggle,
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

    const initialTableState = useMemo(() => {
      if (!dataCascadeUiState) {
        return undefined;
      }

      return {
        expanded: dataCascadeUiState.expanded,
        rowSelection: dataCascadeUiState.rowSelection,
      };
    }, [dataCascadeUiState]);

    const handleTableStateChange = useCallback(
      (nextState: { expanded?: ExpandedState; rowSelection?: RowSelectionState }) => {
        setDataCascadeUiState({
          expanded: nextState.expanded,
          rowSelection: nextState.rowSelection,
        });
      },
      [setDataCascadeUiState]
    );

    const handleScrollChange = useMemo(
      () =>
        throttle((scrollOffset: number) => {
          setDataCascadeUiState({ scrollOffset });
        }, 150),
      [setDataCascadeUiState]
    );

    useEffect(() => {
      return () => handleScrollChange.cancel();
    }, [handleScrollChange]);

    const updateLeafUiState = useCallback(
      (cellId: string, nextState: DataCascadeLeafUiState) => {
        const existingLeafState = dataCascadeUiState?.leafUiState?.[cellId] ?? {};
        setDataCascadeUiState({
          leafUiState: {
            [cellId]: {
              ...existingLeafState,
              ...nextState,
            },
          },
        });
      },
      [dataCascadeUiState?.leafUiState, setDataCascadeUiState]
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
          leafUiState={dataCascadeUiState?.leafUiState?.[cellId]}
          onLeafUiStateChange={(nextState) => updateLeafUiState(cellId, nextState)}
          getScrollElement={getScrollElement}
          getScrollOffset={getScrollOffset}
          getScrollMargin={getScrollMargin}
          preventSizeChangePropagation={preventSizeChangePropagation}
        />
      ),
      [dataCascadeUiState?.leafUiState, dataView, props, updateLeafUiState]
    );

    return (
      <DataCascade<ESQLDataGroupNode>
        size="s"
        overscan={25}
        data={cascadeGroupData}
        cascadeGroups={availableCascadeGroups}
        initialGroupColumn={selectedCascadeGroups}
        initialTableState={initialTableState}
        initialScrollOffset={dataCascadeUiState?.scrollOffset}
        customTableHeader={customTableHeading}
        onScrollChange={handleScrollChange}
        onTableStateChange={handleTableStateChange}
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
