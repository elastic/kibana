/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, Suspense } from 'react';
import {
  DEFAULT_PAGINATION_MODE,
  renderCustomToolbar,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import type { UpdateCascadeGroupingFn } from '../../context_awareness';
import { useProfileAccessor, type UpdateESQLQueryFn } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import {
  useGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
} from '../../application/main/components/layout/cascaded_documents';
import { type CascadedDocumentsRestorableState } from '../../application/main/components/layout/cascaded_documents/cascaded_documents_restorable_state';

export type DiscoverGridProps = UnifiedDataTableProps & {
  query?: DiscoverAppState['query'];
  onUpdateESQLQuery?: UpdateESQLQueryFn;
} & (
    | {
        cascadeConfig?: never;
        onCascadeGroupingChange?: undefined;
        viewModeToggle?: never;
        registerCascadeRequestsInspectorAdapter?: never;
      }
    | {
        cascadeConfig: CascadedDocumentsRestorableState | undefined;
        // when cascade on grouping change handler config is passed to the discover grid component, we expect that all it's supporting props are passed along
        onCascadeGroupingChange: UpdateCascadeGroupingFn;
        onUpdateESQLQuery: UpdateESQLQueryFn;
        viewModeToggle: React.ReactElement | undefined;
        registerCascadeRequestsInspectorAdapter: (requestAdapter: RequestAdapter) => void;
      }
  );

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = ({
  onUpdateESQLQuery,
  onCascadeGroupingChange,
  query,
  viewModeToggle,
  externalAdditionalControls: customExternalAdditionalControls,
  rowAdditionalLeadingControls: customRowAdditionalLeadingControls,
  onFullScreenChange,
  registerCascadeRequestsInspectorAdapter,
  cascadeConfig,
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

  const cascadeGroupingChangeHandler = useCallback(
    (cascadeGrouping: string[]) => {
      return onCascadeGroupingChange?.(cascadeGrouping);
    },
    [onCascadeGroupingChange]
  );

  const groupBySelectorRenderer = useGroupBySelectorRenderer({
    cascadeGroupingChangeHandler,
  });

  const externalAdditionalControls = useMemo(() => {
    const additionalControls = [
      customExternalAdditionalControls,
      Boolean(cascadeConfig?.availableCascadeGroups?.length) && props.isPlainRecord
        ? groupBySelectorRenderer(
            cascadeConfig!.availableCascadeGroups,
            cascadeConfig!.selectedCascadeGroups
          )
        : null,
    ].filter(Boolean);

    return additionalControls.length ? <React.Fragment>{additionalControls}</React.Fragment> : null;
  }, [
    cascadeConfig,
    customExternalAdditionalControls,
    groupBySelectorRenderer,
    props.isPlainRecord,
  ]);

  return props.isPlainRecord && Boolean(cascadeConfig?.selectedCascadeGroups?.length) ? (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LazyCascadedDocumentsLayout
        {...props}
        dataView={dataView}
        viewModeToggle={viewModeToggle}
        cascadeConfig={cascadeConfig!}
        onUpdateESQLQuery={onUpdateESQLQuery!}
        cascadeGroupingChangeHandler={cascadeGroupingChangeHandler}
        registerCascadeRequestsInspectorAdapter={registerCascadeRequestsInspectorAdapter!}
      />
    </Suspense>
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
