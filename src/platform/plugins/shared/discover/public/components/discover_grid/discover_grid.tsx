/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  DEFAULT_PAGINATION_MODE,
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { useProfileAccessor } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import type { DiscoverStateContainer } from '../../application/main/state_management/discover_state';
import {
  useMaybeCascadedDocumentsContext,
  useGetGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
} from '../../application/main/components/layout/cascaded_documents';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  onUpdateESQLQuery?: DiscoverStateContainer['actions']['updateESQLQuery'];
}

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = React.memo(
  ({
    onUpdateESQLQuery,
    query,
    externalAdditionalControls: customExternalAdditionalControls,
    rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
    onFullScreenChange,
    ...props
  }) => {
    const { dataView, setExpandedDoc, renderDocumentView } = props;
    const getRowIndicatorProvider = useProfileAccessor('getRowIndicatorProvider');
    const getRowIndicator = useMemo(() => {
      return getRowIndicatorProvider(() => undefined)({ dataView: props.dataView });
    }, [getRowIndicatorProvider, props.dataView]);

    const getRowAdditionalLeadingControlsAccessor = useProfileAccessor(
      'getRowAdditionalLeadingControls'
    );
    const rowAdditionalLeadingControls = useMemo(() => {
      return getRowAdditionalLeadingControlsAccessor(() => customRowAdditionalLeadingControls)({
        actions: {
          updateESQLQuery: onUpdateESQLQuery,
          setExpandedDoc: renderDocumentView ? setExpandedDoc : undefined,
        },
        dataView,
        query,
      });
    }, [
      customRowAdditionalLeadingControls,
      dataView,
      getRowAdditionalLeadingControlsAccessor,
      onUpdateESQLQuery,
      query,
      setExpandedDoc,
      renderDocumentView,
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

    const cascadedDocumentsContext = useMaybeCascadedDocumentsContext();
    const cascadedDocumentsState = cascadedDocumentsContext?.cascadedDocumentsState;

    const cascadeGroupingChangeHandler = useCallback(
      (cascadeGrouping: string[]) => {
        return cascadedDocumentsContext?.cascadeGroupingChangeHandler(cascadeGrouping);
      },
      [cascadedDocumentsContext]
    );

    const groupBySelectorRenderer = useGetGroupBySelectorRenderer({
      cascadeGroupingChangeHandler,
    });

    const externalAdditionalControls = useMemo(() => {
      const additionalControls = [
        customExternalAdditionalControls,
        cascadedDocumentsState?.availableCascadeGroups.length && props.isPlainRecord
          ? groupBySelectorRenderer(
              cascadedDocumentsState.availableCascadeGroups,
              cascadedDocumentsState.selectedCascadeGroups
            )
          : null,
      ].filter(Boolean);

      return additionalControls.length ? (
        <React.Fragment>{additionalControls}</React.Fragment>
      ) : null;
    }, [
      cascadedDocumentsState,
      customExternalAdditionalControls,
      groupBySelectorRenderer,
      props.isPlainRecord,
    ]);

    return props.isPlainRecord && !!cascadedDocumentsState?.selectedCascadeGroups.length ? (
      <LazyCascadedDocumentsLayout {...props} dataView={dataView} />
    ) : (
      <UnifiedDataTable
        showColumnTokens
        canDragAndDropColumns
        enableComparisonMode
        enableInTableSearch
        renderCustomToolbar={renderCustomToolbar}
        getRowIndicator={getRowIndicator}
        rowAdditionalLeadingControls={rowAdditionalLeadingControls}
        visibleCellActions={3} // this allows to show up to 3 actions on cell hover if available (filter in, filter out, and copy)
        paginationMode={paginationModeConfig.paginationMode}
        customGridColumnsConfiguration={customGridColumnsConfiguration}
        shouldKeepAdHocDataViewImmutable
        externalAdditionalControls={externalAdditionalControls}
        {...props}
      />
    );
  }
);
