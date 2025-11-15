/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, Fragment, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { type AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import { EsqlQuery } from '@kbn/esql-ast';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { getStatsCommandToOperateOn } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useScopedServices } from '../../../../../components/scoped_services_provider/scoped_services_provider';
import { useAppStateSelector } from '../../../state_management/discover_app_state_container';
import { useCurrentTabSelector } from '../../../state_management/redux';
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
import {
  useDataCascadeRowExpansionHandlers,
  useGroupedCascadeData,
  useScopedESQLQueryFetchClient,
} from './hooks';

export { getESQLStatsQueryMeta };
export { useGetGroupBySelectorRenderer as useGroupBySelectorRenderer } from './blocks/use_table_header_components';

export interface ESQLDataCascadeProps extends Omit<UnifiedDataTableProps, 'ref'> {
  defaultFilters?: Filter[];
  viewModeToggle: React.ReactElement | undefined;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
  cascadeConfig: CascadedDocumentsRestorableState;
  togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'];
  queryMeta: ESQLStatsQueryMeta;
}

const ESQLDataCascade = React.memo(
  ({
    rows: initialData,
    dataView,
    viewModeToggle,
    cascadeConfig,
    cascadeGroupingChangeHandler,
    togglePopover,
    queryMeta,
    ...props
  }: ESQLDataCascadeProps) => {
    const [query, defaultFilters] = useAppStateSelector((state) => [state.query, state.filters]);
    const [globalState, esqlVariables] = useCurrentTabSelector((state) => [
      state.globalState,
      state.esqlVariables,
    ]);
    const globalFilters = globalState?.filters;
    const globalTimeRange = globalState?.timeRange;
    const { scopedProfilesManager } = useScopedServices();
    const { expressions } = useDiscoverServices();

    const cascadeGroupData = useGroupedCascadeData({
      cascadeConfig,
      rows: initialData,
      queryMeta,
      esqlVariables,
    });

    const fetchCascadeData = useScopedESQLQueryFetchClient({
      query: query as AggregateQuery,
      dataView,
      data: props.services.data,
      esqlVariables,
      expressions,
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
    });

    const { onCascadeGroupNodeExpanded, onCascadeLeafNodeExpanded } =
      useDataCascadeRowExpansionHandlers({ cascadeFetchClient: fetchCascadeData });

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

    return (
      <DataCascade<ESQLDataGroupNode>
        size="s"
        overscan={25}
        data={cascadeGroupData}
        cascadeGroups={cascadeConfig.availableCascadeGroups}
        initialGroupColumn={cascadeConfig.selectedCascadeGroups}
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
  }: Omit<ESQLDataCascadeProps, 'togglePopover' | 'queryMeta'>) => {
    const [query] = useAppStateSelector((state) => [state.query, state.filters]);
    const [globalState, esqlVariables] = useCurrentTabSelector((state) => [
      state.globalState,
      state.esqlVariables,
    ]);
    const { euiTheme } = useEuiTheme();
    const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);

    const styles = useMemo(() => cascadedDocumentsStyles({ euiTheme }), [euiTheme]);

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta((query as AggregateQuery).esql);
    }, [query]);

    const statsCommandBeingOperatedOn = useMemo(() => {
      const esqlQuery = EsqlQuery.fromSrc((query as AggregateQuery).esql);
      return getStatsCommandToOperateOn(esqlQuery);
    }, [query]);

    const { renderRowActionPopover, togglePopover } = useEsqlDataCascadeRowActionHelpers(
      dataView,
      esqlVariables,
      query as AggregateQuery,
      statsCommandBeingOperatedOn?.grouping,
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
          queryMeta={queryMeta}
          {...props}
        />
      </div>
    );
  }
);
