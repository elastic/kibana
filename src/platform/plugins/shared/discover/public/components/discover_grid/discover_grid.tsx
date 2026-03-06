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
import type { UpdateESQLQueryFn } from '../../context_awareness';
import { useProfileAccessor } from '../../context_awareness';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import type { CascadedDocumentsContext } from '../../application/main/components/layout/cascaded_documents';
import {
  useGetGroupBySelectorRenderer,
  LazyCascadedDocumentsLayout,
  CascadedDocumentsProvider,
} from '../../application/main/components/layout/cascaded_documents';
import { lastValueFrom, map } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import { TanstackVirtualGrid } from './tanstack_virtual_grid';
import { TanStackDataGrid } from './tanstack_data_grid';
import { TanStackCascadeGrid, type FetchGroupDocsParams, type OpenInNewTabFn } from './tanstack_cascade_grid';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface DiscoverGridProps extends UnifiedDataTableProps {
  query?: DiscoverAppState['query'];
  cascadedDocumentsContext?: CascadedDocumentsContext;
  onUpdateESQLQuery?: UpdateESQLQueryFn;
  onOpenInNewTab?: OpenInNewTabFn;
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
    onOpenInNewTab,
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

    const isTanStackCascade = useMemo(() => {
      if (!isOfAggregateQueryType(query)) return false;
      return /\/\*[\s\S]*?\bTanStackCascade\b[\s\S]*?\*\/|\/\/.*\bTanStackCascade\b/.test(query.esql);
    }, [query]);

    const services = useDiscoverServices();

    const fetchGroupDocuments = useCallback(
      async ({ subQuery, dataView: dv, signal }: FetchGroupDocsParams): Promise<DataTableRecord[]> => {
        try {
          const ast = await textBasedQueryStateToAstWithValidation({
            query: subQuery,
            time: services.data.query.timefilter.timefilter.getTime(),
            dataView: dv,
          });

          if (!ast) return [];

          const table = await lastValueFrom(
            services.expressions.run<null, Datatable>(ast, null, {
              inspectorAdapters: {},
              abortSignal: signal,
            }).pipe(map((v) => v.result))
          );

          if (!table?.rows?.length) return [];

          const colIds = table.columns.map((c) => c.id);
          return table.rows.map((row, i) => {
            const flattened: Record<string, unknown> = {};
            for (const col of colIds) {
              flattened[col] = row[col];
            }
            return {
              id: String(i),
              raw: { _id: String(i), _index: '', _source: flattened } as any,
              flattened,
            };
          });
        } catch (err: any) {
          if (err?.name === 'AbortError') throw err;
          // eslint-disable-next-line no-console
          console.error('[TanStackCascade] fetchGroupDocuments error:', err);
          return [];
        }
      },
      [services.data.query.timefilter.timefilter, services.expressions]
    );

    const isTanstackVirtualPoc = useMemo(() => {
      if (!isOfAggregateQueryType(query)) {
        return false;
      }
      return /\/\*[\s\S]*?\btanstack\b[\s\S]*?\*\/|\/\/.*\btanstack\b/i.test(query.esql);
    }, [query]);

    const isTanStackDataGrid = useMemo(() => {
      if (!isOfAggregateQueryType(query)) {
        return false;
      }
      return /\/\*[\s\S]*?\bTanStackGrid\b[\s\S]*?\*\/|\/\/.*\bTanStackGrid\b/.test(query.esql);
    }, [query]);

    if (isTanStackCascade) {
      return (
        <TanStackCascadeGrid
          rows={props.rows ?? []}
          columns={props.columns}
          columnsMeta={props.columnsMeta}
          dataView={props.dataView}
          query={isOfAggregateQueryType(query) ? query : { esql: '' }}
          showTimeCol={props.showTimeCol}
          sort={props.sort}
          onSort={props.onSort}
          onFilter={props.onFilter}
          expandedDoc={props.expandedDoc}
          setExpandedDoc={props.setExpandedDoc}
          renderDocumentView={props.renderDocumentView}
          loadingState={props.loadingState}
          settings={props.settings}
          fetchGroupDocuments={fetchGroupDocuments}
          onOpenInNewTab={onOpenInNewTab}
          availableCascadeGroups={cascadedDocumentsContext?.availableCascadeGroups}
          selectedCascadeGroups={cascadedDocumentsContext?.selectedCascadeGroups}
          onCascadeGroupingChange={cascadedDocumentsContext?.cascadeGroupingChangeHandler}
          externalCustomRenderers={props.externalCustomRenderers}
        />
      );
    }

    if (isTanStackDataGrid) {
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
          loadingState={props.loadingState}
          onFilter={props.onFilter}
          getRowIndicator={getRowIndicator}
          rowAdditionalLeadingControls={rowAdditionalLeadingControls}
          dataGridDensityState={props.dataGridDensityState}
          onUpdateDataGridDensity={props.onUpdateDataGridDensity}
          rowHeightState={props.rowHeightState}
          onUpdateRowHeight={props.onUpdateRowHeight}
          headerRowHeightState={props.headerRowHeightState}
          onUpdateHeaderRowHeight={props.onUpdateHeaderRowHeight}
          externalAdditionalControls={externalAdditionalControls}
        />
      );
    }

    if (isTanstackVirtualPoc) {
      return (
        <TanstackVirtualGrid
          rows={props.rows ?? []}
          columns={props.columns}
          dataView={props.dataView}
          showTimeCol={props.showTimeCol}
          expandedDoc={props.expandedDoc}
          setExpandedDoc={props.setExpandedDoc}
          renderDocumentView={props.renderDocumentView}
          columnsMeta={props.columnsMeta}
          query={isOfAggregateQueryType(query) ? query : undefined}
        />
      );
    }

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
  }
);
