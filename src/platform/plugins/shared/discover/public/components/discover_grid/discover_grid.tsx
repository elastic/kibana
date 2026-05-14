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
  type CustomGridColumnProps,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { setGroupByField } from '@kbn/esql-utils';
import type { UpdateESQLQueryFn } from '../../context_awareness';
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
  cascadedDocumentsContext?: CascadedDocumentsContext;
  onUpdateESQLQuery?: UpdateESQLQueryFn;
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
    onUpdateESQLQuery,
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

    const groupByColumnsConfiguration = useMemo(() => {
      if (!query || !isOfAggregateQueryType(query) || !onUpdateESQLQuery) {
        return customGridColumnsConfiguration;
      }
      return Object.fromEntries(
        (props.columns ?? []).map((colId) => [
          colId,
          (colProps: CustomGridColumnProps) => {
            const base = customGridColumnsConfiguration[colId]?.(colProps) ?? colProps.column;
            const existing = Array.isArray(base.actions?.additional) ? base.actions.additional : [];
            return {
              ...base,
              actions: {
                ...base.actions,
                additional: [
                  ...existing,
                  {
                    label: i18n.translate('discover.groupBy.columnAction.label', {
                      defaultMessage: 'Group by {field}',
                      values: { field: colId },
                    }),
                    iconType: 'layers',
                    size: 'xs',
                    iconProps: { size: 'm' },
                    onClick: () => onUpdateESQLQuery((prev) => setGroupByField(prev, colId)),
                    'data-test-subj': `discoverGroupBy-${colId}`,
                  },
                ],
              },
            };
          },
        ])
      );
    }, [query, props.columns, customGridColumnsConfiguration, onUpdateESQLQuery]);

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
        canDragAndDropColumns
        enableComparisonMode
        enableInTableSearch
        renderCustomToolbar={renderCustomToolbar}
        getRowIndicator={getRowIndicator}
        rowAdditionalLeadingControls={rowAdditionalLeadingControls}
        visibleCellActions={3} // this allows to show up to 3 actions on cell hover if available (filter in, filter out, and copy)
        paginationMode={paginationModeConfig.paginationMode}
        customGridColumnsConfiguration={groupByColumnsConfiguration}
        shouldKeepAdHocDataViewImmutable
        externalAdditionalControls={externalAdditionalControls}
        onFullScreenChange={onFullScreenChange}
        {...props}
      />
    );
  }
);
