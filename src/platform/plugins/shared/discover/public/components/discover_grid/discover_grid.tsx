/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  DEFAULT_PAGINATION_MODE,
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { useProfileAccessor } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import type { CascadedDocumentsContext } from '../../application/main/components/layout/cascaded_documents';
import {
  useGetGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
  CascadedDocumentsProvider,
} from '../../application/main/components/layout/cascaded_documents';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  filters?: DiscoverAppState['filters'];
  cascadedDocumentsContext?: CascadedDocumentsContext;
}

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = React.memo(
  ({
    query,
    filters,
    queryContext: providedQueryContext,
    cascadedDocumentsContext,
    dataSource,
    externalAdditionalControls: customExternalAdditionalControls,
    rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
    onFullScreenChange,
    ...props
  }) => {
    const { dataView } = props;
    const queryContext = useMemo(
      () => providedQueryContext ?? { query, filters },
      [providedQueryContext, query, filters]
    );
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
      if (!customExternalAdditionalControls && !isCascadedDocumentsAvailable) {
        return undefined;
      }

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {customExternalAdditionalControls && (
            <EuiFlexItem grow={false}>{customExternalAdditionalControls}</EuiFlexItem>
          )}
          {isCascadedDocumentsAvailable && (
            <EuiFlexItem grow={false}>
              {groupBySelectorRenderer(
                cascadedDocumentsContext.availableCascadeGroups,
                cascadedDocumentsContext.selectedCascadeGroups
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }, [
      cascadedDocumentsContext,
      customExternalAdditionalControls,
      groupBySelectorRenderer,
      isCascadedDocumentsAvailable,
    ]);

    return isCascadedDocumentsAvailable && cascadedDocumentsContext.selectedCascadeGroups.length ? (
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
    ) : (
      <UnifiedDataTable
        showColumnTokens
        renderCustomToolbar={renderCustomToolbar}
        rowAdditionalLeadingControls={rowAdditionalLeadingControls}
        paginationMode={paginationModeConfig.paginationMode}
        customGridColumnsConfiguration={customGridColumnsConfiguration}
        shouldKeepAdHocDataViewImmutable
        externalAdditionalControls={externalAdditionalControls}
        onFullScreenChange={onFullScreenChange}
        {...props}
        canDragAndDropColumns
        enableComparisonMode
        enableInTableSearch
        showSummaryColumnToggle
        visibleCellActions={3} // this allows to show up to 3 actions on cell hover if available (filter in, filter out, and copy)
        queryContext={queryContext}
        dataSource={dataSource}
        getRowIndicator={getRowIndicator}
      />
    );
  }
);
