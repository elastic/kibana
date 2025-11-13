/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, Fragment, useRef, useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { type AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { apm } from '@elastic/apm-rum';
import { constructCascadeQuery, getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { CascadeQueryArgs } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useScopedServices } from '../../../../../components/scoped_services_provider/scoped_services_provider';
import { useAppStateSelector } from '../../../state_management/discover_app_state_container';
import { useCurrentTabSelector } from '../../../state_management/redux';
import { fetchEsql } from '../../../data_fetching/fetch_esql';
import {
  useEsqlDataCascadeRowHeaderComponents,
  useEsqlDataCascadeHeaderComponent,
  ESQLDataCascadeLeafCell,
  type ESQLDataGroupNode,
  type DataTableRecord,
} from './blocks';
import { cascadedDocumentsStyles } from './cascaded_documents.styles';
import { type CascadedDocumentsRestorableState } from './cascaded_documents_restorable_state';
import { useEsqlDataCascadeRowActionHelpers } from './blocks/use_row_header_components';

export { getESQLStatsQueryMeta };
export { useGetGroupBySelectorRenderer as useGroupBySelectorRenderer } from './blocks/use_table_header_components';

export interface ESQLDataCascadeProps extends Omit<UnifiedDataTableProps, 'ref'> {
  defaultFilters?: Filter[];
  viewModeToggle: React.ReactElement | undefined;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
  cascadeConfig: CascadedDocumentsRestorableState;
  togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'];
}

const ESQLDataCascade = React.memo(
  ({
    rows: initialData,
    dataView,
    viewModeToggle,
    cascadeConfig,
    cascadeGroupingChangeHandler,
    togglePopover,
    ...props
  }: ESQLDataCascadeProps) => {
    const [query, defaultFilters] = useAppStateSelector((state) => [state.query, state.filters]);
    const globalState = useCurrentTabSelector((state) => state.globalState);
    const globalFilters = globalState?.filters;
    const globalTimeRange = globalState?.timeRange;
    const { scopedProfilesManager } = useScopedServices();
    const { expressions } = useDiscoverServices();

    const abortController = useRef<AbortController | null>(null);

    useEffect(
      // handle cleanup for when the component unmounts
      () => () => {
        // cancel any pending requests
        abortController.current?.abort();
      },
      []
    );

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta((query as AggregateQuery).esql);
    }, [query]);

    const scopedESQLQueryFetch = useCallback(
      (esqlQuery: AggregateQuery, abortSignal: AbortSignal) => {
        const inspectorAdapters = { requests: new RequestAdapter() };

        return fetchEsql({
          query: esqlQuery,
          dataView,
          data: props.services.data,
          expressions,
          abortSignal,
          filters: [
            ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
            ...(defaultFilters ?? []),
          ],
          ...(globalTimeRange && {
            timeRange: {
              to: globalTimeRange.to,
              from: globalTimeRange.from,
            },
          }),
          scopedProfilesManager,
          inspectorAdapters,
        });
      },
      [
        dataView,
        defaultFilters,
        expressions,
        globalFilters,
        globalTimeRange,
        props.services.data,
        scopedProfilesManager,
      ]
    );

    const cascadeGroupData = React.useMemo(
      () =>
        (initialData ?? []).map((datum) => ({
          id: datum.id,
          ...datum.flattened,
        })),
      [initialData]
    );

    const customTableHeading = useEsqlDataCascadeHeaderComponent({
      viewModeToggle,
      cascadeGroupingChangeHandler,
    });

    const { rowActions, rowHeaderMeta, rowHeaderTitle } = useEsqlDataCascadeRowHeaderComponents(
      queryMeta,
      props.columns,
      togglePopover
    );

    const cascadeLeafRowRenderer = useCallback<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']
    >(
      ({ data: cellData, cellId, getScrollElement, getScrollOffset, getScrollMargin }) => (
        <ESQLDataCascadeLeafCell
          {...props}
          dataView={dataView}
          cellData={cellData!}
          cellId={cellId}
          getScrollElement={getScrollElement}
          getScrollOffset={getScrollOffset}
          getScrollMargin={getScrollMargin}
        />
      ),
      [dataView, props]
    );

    const fetchCascadeData = useCallback(
      async ({ nodeType, nodePath, nodePathMap }: Omit<CascadeQueryArgs, 'query' | 'dataView'>) => {
        const newQuery = constructCascadeQuery({
          query: query as AggregateQuery,
          dataView,
          nodeType,
          nodePath,
          nodePathMap,
        });

        if (!newQuery) {
          apm.captureError(new Error('Failed to construct cascade query'));
          return [];
        }

        if (!abortController.current?.signal?.aborted) {
          // cancel pending requests, if any
          abortController.current?.abort();
        }

        abortController.current = new AbortController();

        const { records } = await scopedESQLQueryFetch(newQuery, abortController.current!.signal);

        return records;
      },
      [query, dataView, scopedESQLQueryFetch]
    );

    const onCascadeGroupNodeExpanded = useCallback<
      NonNullable<
        DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
      >
    >(
      ({ nodePath, nodePathMap }) => {
        return fetchCascadeData({
          nodePath,
          nodePathMap,
          nodeType: 'group',
        }) as unknown as Promise<ESQLDataGroupNode[]>;
      },
      [fetchCascadeData]
    );

    const onCascadeLeafNodeExpanded = useCallback<
      NonNullable<
        DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>
      >['onCascadeLeafNodeExpanded']
    >(
      ({ nodePath, nodePathMap }) => {
        return fetchCascadeData({
          nodePath,
          nodePathMap,
          nodeType: 'leaf',
        });
      },
      [fetchCascadeData]
    );

    return (
      <DataCascade<ESQLDataGroupNode>
        size="s"
        overscan={25}
        data={cascadeGroupData}
        cascadeGroups={cascadeConfig.availableCascadeGroups}
        initialGroupColumn={[...cascadeConfig.selectedCascadeGroups]}
        customTableHeader={customTableHeading}
      >
        <DataCascadeRow<ESQLDataGroupNode, DataTableRecord>
          rowHeaderTitleSlot={rowHeaderTitle}
          rowHeaderMetaSlots={rowHeaderMeta}
          rowHeaderActions={rowActions}
          onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
        >
          <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
            {cascadeLeafRowRenderer}
          </DataCascadeRowCell>
        </DataCascadeRow>
      </DataCascade>
    );
  }
);

export const CascadedDocumentsLayout = React.memo(
  ({
    dataView,
    viewModeToggle,
    cascadeConfig,
    cascadeGroupingChangeHandler,
    ...props
  }: Omit<ESQLDataCascadeProps, 'togglePopover'>) => {
    const [query] = useAppStateSelector((state) => [state.query, state.filters]);
    const globalState = useCurrentTabSelector((state) => state.globalState);
    const { euiTheme } = useEuiTheme();
    const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);

    const styles = useMemo(() => cascadedDocumentsStyles({ euiTheme }), [euiTheme]);

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta((query as AggregateQuery).esql);
    }, [query]);

    const { renderRowActionPopover, togglePopover } = useEsqlDataCascadeRowActionHelpers(
      dataView,
      query as AggregateQuery,
      queryMeta,
      globalState,
      props.services
    );

    return (
      <div css={styles.wrapper} ref={cascadeWrapperRef}>
        <Fragment>{renderRowActionPopover(cascadeWrapperRef.current ?? undefined)}</Fragment>
        <ESQLDataCascade
          dataView={dataView}
          viewModeToggle={viewModeToggle}
          cascadeConfig={cascadeConfig}
          cascadeGroupingChangeHandler={cascadeGroupingChangeHandler}
          togglePopover={togglePopover}
          {...props}
        />
      </div>
    );
  }
);
