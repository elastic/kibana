/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EuiText } from '@elastic/eui';
import {
  getRenderCustomToolbarWithElements,
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  type UnifiedDataTableProps,
  type UnifiedDataTableRenderCustomToolbar,
} from '@kbn/unified-data-table';
import { type DataCascadeRowCellProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord, SortOrder } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { useDiscoverServices } from '../../../../../../hooks/use_discover_services';

import type { ESQLDataGroupNode } from './types';
import {
  CustomCascadeGridBody,
  CascadeGridBodyContext,
  type CascadeGridBodyContextValue,
  cascadeToolbarPortalNodeTestSubjAttribute,
} from './cascade_leaf_custom_grid_body';
import { useCascadedDocumentsContext } from '../cascaded_documents_provider';

interface ESQLDataCascadeLeafCellProps
  extends Pick<
      UnifiedDataTableProps,
      | 'dataGridDensityState'
      | 'showTimeCol'
      | 'dataView'
      | 'externalCustomRenderers'
      | 'onUpdateDataGridDensity'
    >,
    Pick<
      Parameters<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']>[0],
      'virtualizerController' | 'nodePath' | 'nodePathMap' | 'stickyHeaderExtensionPoint'
    > {
  cellData: DataTableRecord[];
  cellId: string;
  rowIndex: number;
}

const EMPTY_SORT: SortOrder[] = [];

type GridUiState = NonNullable<UnifiedDataTableProps['initialState']>;

/**
 * The grid settings that change the height of its rows, measurements taken with other settings can't be reused.
 */
const getMeasurementKey = (gridUiState?: GridUiState) =>
  JSON.stringify([gridUiState?.density, gridUiState?.rowHeight, gridUiState?.headerRowHeight]);

/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 */
export const CustomCascadeGridBodyMemoized = React.memo(CustomCascadeGridBody);

export const ESQLDataCascadeLeafCell = React.memo(
  ({
    cellData,
    cellId,
    dataGridDensityState,
    showTimeCol,
    dataView,
    externalCustomRenderers,
    virtualizerController,
    rowIndex,
    onUpdateDataGridDensity,
    nodePath,
    nodePathMap,
    stickyHeaderExtensionPoint,
  }: ESQLDataCascadeLeafCellProps) => {
    const services = useDiscoverServices();
    const {
      cascadedLeafDataSource,
      expandedDoc$,
      expandedDocOwner$,
      getExpandedDocSetter,
      getRenderDocumentViewMetaSetter,
      getDataGridUiStateMap,
      setDataGridUiState,
    } = useCascadedDocumentsContext();
    const expandedDoc = useObservable(expandedDoc$, expandedDoc$.getValue());
    const expandedDocOwner = useObservable(expandedDocOwner$, expandedDocOwner$.getValue());
    const setExpandedDoc = useMemo(
      () => getExpandedDocSetter(cellId, { nodePath, nodePathMap }),
      [cellId, getExpandedDocSetter, nodePath, nodePathMap]
    );
    const setRenderDocumentViewMeta = useMemo(
      () => getRenderDocumentViewMetaSetter(cellId),
      [cellId, getRenderDocumentViewMetaSetter]
    );

    const [cascadeDataGridDensityState, setCascadeDataGridDensityState] = useState<DataGridDensity>(
      dataGridDensityState ?? DataGridDensity.COMPACT
    );

    const initialGridState = useMemo(
      () => getDataGridUiStateMap()?.[cellId],
      [cellId, getDataGridUiStateMap]
    );

    const [measurementKey, setMeasurementKey] = useState(() => getMeasurementKey(initialGridState));

    const onInitialStateChange = useCallback<
      NonNullable<UnifiedDataTableProps['onInitialStateChange']>
    >(
      (newInitialGridState) => {
        setDataGridUiState(cellId, newInitialGridState);
        setMeasurementKey(getMeasurementKey(newInitialGridState));
      },
      [cellId, setDataGridUiState]
    );

    // TODO: Implement column selection logic,
    // probably requires a new selection component that will be used within the row
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    useEffect(() => {
      // propagate localized changes of the data grid density,
      // so that other rows can use the same density value
      onUpdateDataGridDensity?.(cascadeDataGridDensityState);
    }, [cascadeDataGridDensityState, onUpdateDataGridDensity]);

    const [isCellInFullScreenMode, setIsCellInFullScreenMode] = useState(false);

    // In full screen mode the grid is fixed-positioned above the cascade, so the sticky header
    // slot is not visible and the toolbar/header must stay in their default positions.
    const stickyHeaderPortalTarget = !isCellInFullScreenMode
      ? stickyHeaderExtensionPoint.extensionPointElement
      : null;

    // include reference to the sticky header portal target for the in-table search to use as additional search trigger elements
    const additionalSearchScopeElements = useMemo(
      () => (stickyHeaderPortalTarget ? [stickyHeaderPortalTarget] : []),
      [stickyHeaderPortalTarget]
    );

    const headerPortalNode = useMemo(() => createHtmlPortalNode(), []);

    // The data grid toolbar is rendered by EuiDataGrid outside of the custom grid body. To move it
    // into the cascade sticky header without remounting it, it is rendered into a reverse portal
    // node; an `OutPortal` places it in the inline header, or inside the grid in fullscreen mode,
    // keeping its React subtree and state persisted between these transitions.
    const toolbarPortalNode = useMemo(
      () =>
        createHtmlPortalNode({
          attributes: {
            ['data-test-subj']: cascadeToolbarPortalNodeTestSubjAttribute,
          },
        }),
      []
    );

    const focusedPortalElement = useRef<HTMLElement | null>(null);
    const onFullScreenChange = useCallback(
      (isFullScreen: boolean) => {
        const activeElement = document.activeElement;
        focusedPortalElement.current =
          activeElement instanceof HTMLElement &&
          (toolbarPortalNode.element.contains(activeElement) ||
            headerPortalNode.element.contains(activeElement))
            ? activeElement
            : null;
        setIsCellInFullScreenMode(isFullScreen);
      },
      [toolbarPortalNode, headerPortalNode]
    );

    useLayoutEffect(() => {
      focusedPortalElement.current?.focus({ preventScroll: true });
      focusedPortalElement.current = null;
    }, [isCellInFullScreenMode]);

    const renderToolbarWithElements = useMemo(
      () =>
        getRenderCustomToolbarWithElements({
          leftSide: (
            <EuiText size="s">
              <b>
                <FormattedMessage
                  id="discover.dataCascade.row.cell.toolbar.heading"
                  defaultMessage="{count, plural, =0 {no results} =1 {1 result} other {# results}}"
                  values={{ count: cellData.length }}
                />
              </b>
            </EuiText>
          ),
        }),
      [cellData.length]
    );

    const scrollToRowRef = useRef<((rowIndex: number) => void) | null>(null);

    const scrollToCell = useCallback<NonNullable<UnifiedDataTableProps['scrollToCell']>>(
      ({ rowIndex: matchRowIndex }) => {
        // the match row index maps directly onto `cellData`, since the leaf grid is not paginated
        scrollToRowRef.current?.(matchRowIndex);
      },
      []
    );

    const renderCustomToolbar = useCallback<UnifiedDataTableRenderCustomToolbar>(
      (toolbarProps) => (
        <>
          <InPortal node={toolbarPortalNode}>{renderToolbarWithElements(toolbarProps)}</InPortal>
          {/* while the toolbar isn't shown in the sticky header it stays where the grid renders it */}
          {stickyHeaderPortalTarget === null && <OutPortal node={toolbarPortalNode} />}
        </>
      ),
      [toolbarPortalNode, renderToolbarWithElements, stickyHeaderPortalTarget]
    );

    const gridBodyContext = useMemo<CascadeGridBodyContextValue>(
      () => ({
        data: cellData,
        virtualizerController,
        cellId,
        rowIndex,
        isFullScreenMode: isCellInFullScreenMode,
        toolbarPortalNode,
        headerPortalNode,
        stickyHeaderPortalTarget,
        stickyHeaderExtensionPoint,
        measurementKey,
        scrollToRowRef,
      }),
      [
        cellData,
        virtualizerController,
        cellId,
        rowIndex,
        isCellInFullScreenMode,
        toolbarPortalNode,
        headerPortalNode,
        stickyHeaderPortalTarget,
        stickyHeaderExtensionPoint,
        measurementKey,
      ]
    );

    return (
      <CascadeGridBodyContext.Provider value={gridBodyContext}>
        <UnifiedDataTable
          dataView={dataView}
          showTimeCol={showTimeCol}
          services={services}
          sort={EMPTY_SORT}
          isSortEnabled={false}
          enableInTableSearch
          additionalSearchScopeElements={additionalSearchScopeElements}
          enableComparisonMode
          scrollToCell={scrollToCell}
          showKeyboardShortcuts={false}
          ariaLabelledBy="data-cascade-leaf-cell"
          rows={cellData}
          loadingState={DataLoadingState.loaded}
          columns={selectedColumns}
          dataSource={cascadedLeafDataSource}
          onSetColumns={setSelectedColumns}
          renderCustomToolbar={renderCustomToolbar}
          expandedDoc={expandedDocOwner === cellId ? expandedDoc : undefined}
          setExpandedDoc={setExpandedDoc}
          dataGridDensityState={cascadeDataGridDensityState}
          onUpdateDataGridDensity={setCascadeDataGridDensityState}
          renderDocumentView="external"
          setRenderDocumentViewMeta={setRenderDocumentViewMeta}
          renderCustomGridBody={CustomCascadeGridBodyMemoized}
          onFullScreenChange={onFullScreenChange}
          externalCustomRenderers={externalCustomRenderers}
          isPaginationEnabled={false}
          paginationMode="infinite"
          sampleSizeState={cellData.length}
          initialState={initialGridState}
          onInitialStateChange={onInitialStateChange}
        />
      </CascadeGridBodyContext.Provider>
    );
  }
);
