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
import { DiscoverGridImplementationSwitch } from './discover_grid_implementation_switch';
import { useDiscoverGridImplementation } from './use_discover_grid_implementation';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  cascadedDocumentsContext?: CascadedDocumentsContext;
  tanStackToolbarLeftSide?: ReactNode;
  tanStackToolbarTrailingControl?: ReactNode;
}

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = React.memo(
  ({
    query,
    cascadedDocumentsContext,
    externalAdditionalControls: customExternalAdditionalControls,
    rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
    onFullScreenChange,
    tanStackToolbarLeftSide,
    tanStackToolbarTrailingControl,
    ...props
  }) => {
    const { dataView, services } = props;
    const { usesUnifiedDataTable, toggleImplementation } = useDiscoverGridImplementation(
      services.storage
    );

    const getRowIndicatorProvider = useProfileAccessor('getRowIndicatorProvider');
    const getRowIndicator = useMemo(() => {
      return getRowIndicatorProvider(() => undefined)({ dataView: props.dataView });
    }, [getRowIndicatorProvider, props.dataView]);

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
      props.isPlainRecord && !!cascadedDocumentsContext?.availableCascadeGroups.length;

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

    const gridImplementationSwitch = (
      <DiscoverGridImplementationSwitch
        usesUnifiedDataTable={usesUnifiedDataTable}
        onSwitch={toggleImplementation}
      />
    );

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
          />
        </CascadedDocumentsProvider>
      );
    }

    if (!usesUnifiedDataTable) {
      return (
        <TanStackDataGrid
          rows={props.rows ?? []}
          columns={props.columns}
          columnsMeta={props.columnsMeta}
          dataView={props.dataView}
          query={isOfAggregateQueryType(query) ? query : undefined}
          showTimeCol={props.showTimeCol}
          isPlainRecord={props.isPlainRecord}
          showColumnTokens
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
          shouldKeepAdHocDataViewImmutable={props.shouldKeepAdHocDataViewImmutable}
          getRowIndicator={getRowIndicator}
          rowAdditionalLeadingControls={rowAdditionalLeadingControls}
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
          onFullScreenChange={onFullScreenChange}
          services={services}
          externalAdditionalControls={externalAdditionalControls}
          gridImplementationSwitch={gridImplementationSwitch}
          toolbarLeftSide={tanStackToolbarLeftSide}
          toolbarTrailingControl={tanStackToolbarTrailingControl}
          showKeyboardShortcuts={props.showKeyboardShortcuts}
          showSummaryColumnToggle
          enableComparisonMode
          ariaLabelledBy={props.ariaLabelledBy}
          showFullScreenButton={props.showFullScreenButton}
        />
      );
    }

    return (
      <UnifiedDataTable
        showColumnTokens
        canDragAndDropColumns
        enableComparisonMode
        enableInTableSearch
        showSummaryColumnToggle
        renderCustomToolbar={renderCustomToolbar}
        getRowIndicator={getRowIndicator}
        rowAdditionalLeadingControls={rowAdditionalLeadingControls}
        visibleCellActions={3} // this allows to show up to 3 actions on cell hover if available (filter in, filter out, and copy)
        paginationMode={paginationModeConfig.paginationMode}
        customGridColumnsConfiguration={customGridColumnsConfiguration}
        shouldKeepAdHocDataViewImmutable
        externalAdditionalControls={externalAdditionalControls}
        onFullScreenChange={onFullScreenChange}
        {...props}
        additionalDisplaySettingsContent={gridImplementationSwitch}
      />
    );
  }
);
