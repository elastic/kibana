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
import type { AggregateQuery } from '@kbn/es-query';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import { useProfileAccessor } from '../../context_awareness';
import type {
  CascadedDocumentsState,
  DiscoverAppState,
} from '../../application/main/state_management/redux';
import type { DiscoverStateContainer } from '../../application/main/state_management/discover_state';
import {
  useGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
} from '../../application/main/components/layout/cascaded_documents';

export type DiscoverGridProps = UnifiedDataTableProps & {
  query?: DiscoverAppState['query'];
} & (
    | {
        cascadeConfig?: never;
        onCascadeGroupingChange?: undefined;
        onUpdateESQLQuery?: DiscoverStateContainer['actions']['updateESQLQuery'];
        viewModeToggle?: never;
        registerCascadeRequestsInspectorAdapter?: never;
      }
    | {
        cascadeConfig: CascadedDocumentsState | undefined;
        // when cascade on grouping change handler config is passed to the discover grid component, we expect that all it's supporting props are passed along
        onCascadeGroupingChange: DiscoverStateContainer['actions']['onCascadeGroupingChange'];
        onUpdateESQLQuery: DiscoverStateContainer['actions']['updateESQLQuery'];
        viewModeToggle: React.ReactElement | undefined;
        registerCascadeRequestsInspectorAdapter: (requestAdapter: RequestAdapter) => void;
      }
  );

/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export const DiscoverGrid: React.FC<DiscoverGridProps> = React.memo(
  ({
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

    /**
     * For the discover use case we use this function to hook into the app state container,
     * so that we can respond to changes in the cascade grouping.
     * We don't have to, but doing it this way means we get all the error handling and loading utils already existing there.
     */
    const cascadeGroupingChangeHandler = useCallback(
      (cascadeGrouping: string[]) => {
        return onCascadeGroupingChange?.({ query: query as AggregateQuery, cascadeGrouping });
      },
      [onCascadeGroupingChange, query]
    );

    const groupBySelectorRenderer = useGroupBySelectorRenderer({
      cascadeGroupingChangeHandler,
    });

    const externalAdditionalControls = useMemo(() => {
      const additionalControls = [
        customExternalAdditionalControls,
        cascadeConfig?.availableCascadeGroups.length && props.isPlainRecord
          ? groupBySelectorRenderer(
              cascadeConfig.availableCascadeGroups,
              cascadeConfig.selectedCascadeGroups
            )
          : null,
      ].filter(Boolean);

      return additionalControls.length ? (
        <React.Fragment>{additionalControls}</React.Fragment>
      ) : null;
    }, [
      cascadeConfig,
      customExternalAdditionalControls,
      groupBySelectorRenderer,
      props.isPlainRecord,
    ]);

    return props.isPlainRecord && !!cascadeConfig?.selectedCascadeGroups.length ? (
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
  }
);
