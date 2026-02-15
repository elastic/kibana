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
import type { UpdateESQLQueryFn } from '../../context_awareness';
import { ContextAwarenessToolkitProvider, useProfileAccessor } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import type { CascadedDocumentsContext } from '../../application/main/components/layout/cascaded_documents';
import {
  useGetGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
  CascadedDocumentsProvider,
} from '../../application/main/components/layout/cascaded_documents';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  cascadedDocumentsContext?: CascadedDocumentsContext;
  onUpdateESQLQuery?: UpdateESQLQueryFn;
}

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
const DiscoverGridInner: React.FC<DiscoverGridProps> = ({
  query,
  cascadedDocumentsContext,
  externalAdditionalControls: customExternalAdditionalControls,
  rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
  onUpdateESQLQuery: _onUpdateESQLQuery,
  onFullScreenChange,
  ...props
}) => {
  const { dataView } = props;
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

  return isCascadedDocumentsAvailable && cascadedDocumentsContext.selectedCascadeGroups.length ? (
    <CascadedDocumentsProvider value={cascadedDocumentsContext}>
      <LazyCascadedDocumentsLayout {...props} />
    </CascadedDocumentsProvider>
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
      onFullScreenChange={onFullScreenChange}
      {...props}
    />
  );
};

export const DiscoverGrid: React.FC<DiscoverGridProps> = React.memo((props) => {
  const { onUpdateESQLQuery, renderDocumentView, setExpandedDoc } = props;

  const toolkitOverrides = useMemo(() => {
    const actions = {
      ...(onUpdateESQLQuery ? { updateESQLQuery: onUpdateESQLQuery } : {}),
      ...(renderDocumentView ? { setExpandedDoc } : {}),
    };

    return Object.keys(actions).length ? { actions } : undefined;
  }, [onUpdateESQLQuery, renderDocumentView, setExpandedDoc]);

  return (
    <ContextAwarenessToolkitProvider value={toolkitOverrides}>
      <DiscoverGridInner {...props} />
    </ContextAwarenessToolkitProvider>
  );
});
