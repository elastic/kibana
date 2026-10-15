/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import {
  DEFAULT_PAGINATION_MODE,
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { useProfileAccessor } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import type { CascadedDocumentsContext } from '../../application/main/components/layout/cascaded_documents';
import {
  useGetGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
  CascadedDocumentsProvider,
} from '../../application/main/components/layout/cascaded_documents';
import { TanStackDataGrid } from './tanstack_data_grid';
import { useDiscoverGridImplementation } from './use_discover_grid_implementation';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  cascadedDocumentsContext?: CascadedDocumentsContext;
  /**
   * Shared toolbar slot rendered by both grids when supported.
   * Currently consumed by TanStack as `toolbarLeftSide`.
   */
  toolbarLeftSide?: ReactNode;
  /**
   * Shared toolbar trailing slot. Currently consumed by TanStack as `toolbarTrailingControl`.
   */
  toolbarTrailingControl?: ReactNode;
  /**
   * Shared toolbar bottom slot (callouts, loading indicator). Currently consumed by TanStack as
   * `toolbarBottomSection`; UnifiedDataTable receives it via `renderCustomToolbar`.
   */
  toolbarBottomSection?: ReactNode;
}

/**
 * Customized Discover documents grid that can render either UnifiedDataTable (EUI)
 * or TanStackDataGrid, selected by the `discover.enableTanstackTable` feature flag.
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = React.memo(
  ({
    query,
    cascadedDocumentsContext,
    dataSource,
    externalAdditionalControls: customExternalAdditionalControls,
    rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
    onFullScreenChange,
    toolbarLeftSide,
    toolbarTrailingControl,
    toolbarBottomSection,
    ...props
  }) => {
    const { dataView, services } = props;
    const gridImplementation = useDiscoverGridImplementation();
    const usesUnifiedDataTable = gridImplementation === 'unified';

    const getRowIndicatorProvider = useProfileAccessor('getRowIndicatorProvider');
    const getRowIndicator = useMemo(() => {
      return getRowIndicatorProvider(() => undefined)({ dataView: props.dataView, dataSource });
    }, [dataSource, getRowIndicatorProvider, props.dataView]);

    const getRowAdditionalLeadingControlsAccessor = useProfileAccessor(
      'getRowAdditionalLeadingControls'
    );
    const rowAdditionalLeadingControls = useMemo(() => {
      return getRowAdditionalLeadingControlsAccessor(() => customRowAdditionalLeadingControls)({
        dataView,
        query,
      });
    }, [
      customRowAdditionalLeadingControls,
      dataView,
      getRowAdditionalLeadingControlsAccessor,
      query,
    ]);

    const getPaginationConfigAccessor = useProfileAccessor('getPaginationConfig');
    const paginationModeConfig = useMemo(() => {
      return getPaginationConfigAccessor(() => ({
        paginationMode: DEFAULT_PAGINATION_MODE,
      }))();
    }, [getPaginationConfigAccessor]);

    const getColumnsConfigurationAccessor = useProfileAccessor('getColumnsConfiguration');

    const customGridColumnsConfiguration = useMemo(() => {
      return getColumnsConfigurationAccessor(() => ({}))();
    }, [getColumnsConfigurationAccessor]);

    const cascadeGroupingChangeHandler = useCallback(
      (cascadeGrouping: string[]) => {
        return cascadedDocumentsContext?.cascadeGroupingChangeHandler(cascadeGrouping);
      },
      [cascadedDocumentsContext]
    );

    const groupBySelectorRenderer = useGetGroupBySelectorRenderer({
      cascadeGroupingChangeHandler,
    });

    const isCascadedDocumentsAvailable =
      dataSource?.kind === 'esql' && !!cascadedDocumentsContext?.availableCascadeGroups.length;

    const externalAdditionalControls = useMemo(() => {
      const additionalControls: ReactNode[] = [];

      if (customExternalAdditionalControls) {
        additionalControls.push(customExternalAdditionalControls);
      }

      if (isCascadedDocumentsAvailable) {
        additionalControls.push(
          groupBySelectorRenderer(
            cascadedDocumentsContext.availableCascadeGroups,
            cascadedDocumentsContext.selectedCascadeGroups
          )
        );
      }

      return additionalControls.length ? additionalControls : undefined;
    }, [
      cascadedDocumentsContext,
      customExternalAdditionalControls,
      groupBySelectorRenderer,
      isCascadedDocumentsAvailable,
    ]);

    // Props both implementations already honor — keep this list the swap contract for A/B testing.
    const sharedGridProps = {
      showColumnTokens: true as const,
      enableComparisonMode: true as const,
      showSummaryColumnToggle: true as const,
      getRowIndicator,
      rowAdditionalLeadingControls,
      shouldKeepAdHocDataViewImmutable: true as const,
      externalAdditionalControls,
      onFullScreenChange,
    };

    if (isCascadedDocumentsAvailable && cascadedDocumentsContext.selectedCascadeGroups.length) {
      return (
        <CascadedDocumentsProvider value={cascadedDocumentsContext}>
          <LazyCascadedDocumentsLayout
            rows={props.rows}
            columns={props.columns}
            dataGridDensityState={props.dataGridDensityState}
            showTimeCol={props.showTimeCol}
            dataView={props.dataView}
            showKeyboardShortcuts={props.showKeyboardShortcuts}
            externalCustomRenderers={props.externalCustomRenderers}
            onUpdateDataGridDensity={props.onUpdateDataGridDensity}
            gridImplementation={gridImplementation}
          />
        </CascadedDocumentsProvider>
      );
    }

    if (!usesUnifiedDataTable) {
      return (
        <TanStackDataGrid
          {...sharedGridProps}
          rows={props.rows ?? []}
          columns={props.columns}
          dataSource={dataSource}
          externalCustomRenderers={props.externalCustomRenderers}
          dataView={props.dataView}
          query={isOfAggregateQueryType(query) ? query : undefined}
          showTimeCol={props.showTimeCol}
          sort={props.sort}
          onSort={props.onSort}
          isSortEnabled={props.isSortEnabled}
          settings={props.settings}
          onResize={props.onResize}
          onSetColumns={props.onSetColumns}
          expandedDoc={props.expandedDoc}
          setExpandedDoc={props.setExpandedDoc}
          renderDocumentView={props.renderDocumentView}
          setRenderDocumentViewMeta={props.setRenderDocumentViewMeta}
          loadingState={props.loadingState}
          onFilter={props.onFilter}
          onFieldEdited={props.onFieldEdited}
          dataGridDensityState={props.dataGridDensityState}
          onUpdateDataGridDensity={props.onUpdateDataGridDensity}
          rowHeightState={props.rowHeightState}
          onUpdateRowHeight={props.onUpdateRowHeight}
          configRowHeight={props.configRowHeight}
          headerRowHeightState={props.headerRowHeightState}
          onUpdateHeaderRowHeight={props.onUpdateHeaderRowHeight}
          configHeaderRowHeight={props.configHeaderRowHeight}
          maxAllowedSampleSize={props.maxAllowedSampleSize}
          sampleSizeState={props.sampleSizeState}
          onUpdateSampleSize={props.onUpdateSampleSize}
          services={services}
          toolbarLeftSide={toolbarLeftSide}
          toolbarTrailingControl={toolbarTrailingControl}
          toolbarBottomSection={toolbarBottomSection}
          maxDocFieldsDisplayed={props.maxDocFieldsDisplayed}
          hideFilteringOnComputedColumns={props.hideFilteringOnComputedColumns}
          initialState={props.initialState}
          onInitialStateChange={props.onInitialStateChange}
          cellActionsTriggerId={props.cellActionsTriggerId}
          cellActionsMetadata={props.cellActionsMetadata}
          showKeyboardShortcuts={props.showKeyboardShortcuts}
          showMultiFields={props.showMultiFields}
          ariaLabelledBy={props.ariaLabelledBy}
          showFullScreenButton={props.showFullScreenButton}
          isPaginationEnabled={props.isPaginationEnabled}
          paginationMode={paginationModeConfig.paginationMode}
          rowsPerPageState={props.rowsPerPageState}
          rowsPerPageOptions={props.rowsPerPageOptions}
          onUpdateRowsPerPage={props.onUpdateRowsPerPage}
          onUpdatePageIndex={props.onUpdatePageIndex}
          totalHits={props.totalHits}
          documentsDisplayModeState={props.documentsDisplayModeState}
          onUpdateDocumentsDisplayMode={props.onUpdateDocumentsDisplayMode}
          jsonModeSettingsState={props.jsonModeSettingsState}
          onUpdateJsonModeSettings={props.onUpdateJsonModeSettings}
          onFetchMoreRecords={props.onFetchMoreRecords}
        />
      );
    }

    return (
      <UnifiedDataTable
        canDragAndDropColumns
        enableInTableSearch
        renderCustomToolbar={renderCustomToolbar}
        visibleCellActions={3} // up to 3 actions on cell hover (filter in/out, copy)
        paginationMode={paginationModeConfig.paginationMode}
        customGridColumnsConfiguration={customGridColumnsConfiguration}
        {...props}
        {...sharedGridProps}
        dataSource={dataSource}
      />
    );
  }
);
