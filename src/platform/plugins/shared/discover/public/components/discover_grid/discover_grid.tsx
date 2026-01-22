/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  DEFAULT_PAGINATION_MODE,
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { useProfileAccessor, type UpdateESQLQueryFn } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  onUpdateESQLQuery?: UpdateESQLQueryFn;
}

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = ({
  onUpdateESQLQuery,
  query,
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

  return (
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
      onFullScreenChange={onFullScreenChange}
      {...props}
    />
  );
};
