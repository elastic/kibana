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
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import { EsqlQuery } from '@kbn/esql-language';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { getStatsCommandToOperateOn } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useScopedServices } from '../../../../../components/scoped_services_provider/scoped_services_provider';
import {
  useEsqlDataCascadeRowHeaderComponents,
  useEsqlDataCascadeHeaderComponent,
  ESQLDataCascadeLeafCell,
  type ESQLDataGroupNode,
} from './blocks';
import { cascadedDocumentsStyles } from './cascaded_documents.styles';
import { useEsqlDataCascadeRowActionHelpers } from './blocks/use_row_header_components';
import {
  useDataCascadeRowExpansionHandlers,
  useGroupedCascadeData,
  useScopedESQLQueryFetchClient,
} from './hooks';
import { useCascadedDocumentsContext } from './cascaded_documents_provider';

export interface ESQLDataCascadeProps extends Omit<UnifiedDataTableProps, 'ref'> {
  togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'];
  queryMeta: ESQLStatsQueryMeta;
}

const ESQLDataCascade = React.memo(
  ({ rows, dataView, togglePopover, queryMeta, ...props }: ESQLDataCascadeProps) => {
    const {
      cascadedDocumentsState,
      esqlQuery,
      esqlVariables,
      timeRange,
      viewModeToggle,
      cascadeGroupingChangeHandler,
      registerCascadeRequestsInspectorAdapter,
    } = useCascadedDocumentsContext();
    const { scopedProfilesManager } = useScopedServices();
    const { expressions } = useDiscoverServices();

    const cascadeRequestsInspectorAdapter = useRef<RequestAdapter>(new RequestAdapter());

    useEffect(() => {
      registerCascadeRequestsInspectorAdapter(cascadeRequestsInspectorAdapter.current);
    }, [registerCascadeRequestsInspectorAdapter]);

    const cascadeGroupData = useGroupedCascadeData({
      cascadedDocumentsState,
      rows,
      queryMeta,
      esqlVariables,
    });

    const fetchCascadeData = useScopedESQLQueryFetchClient({
      query: esqlQuery,
      dataView,
      data: props.services.data,
      esqlVariables,
      expressions,
      timeRange,
      scopedProfilesManager,
      inspectorAdapters: { requests: cascadeRequestsInspectorAdapter.current },
    });

    const {
      onCascadeGroupNodeExpanded,
      onCascadeGroupNodeCollapsed,
      onCascadeLeafNodeExpanded,
      onCascadeLeafNodeCollapsed,
    } = useDataCascadeRowExpansionHandlers({ cascadeFetchClient: fetchCascadeData });

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
        cascadeGroups={cascadedDocumentsState.availableCascadeGroups}
        initialGroupColumn={cascadedDocumentsState.selectedCascadeGroups}
        customTableHeader={customTableHeading}
      >
        <DataCascadeRow<ESQLDataGroupNode, DataTableRecord>
          rowHeaderTitleSlot={rowHeaderTitle}
          rowHeaderMetaSlots={rowHeaderMeta}
          rowHeaderActions={rowActions}
          onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
          onCascadeGroupNodeCollapsed={onCascadeGroupNodeCollapsed}
        >
          <DataCascadeRowCell
            onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}
            onCascadeLeafNodeCollapsed={onCascadeLeafNodeCollapsed}
          >
            {cascadeLeafRowRenderer}
          </DataCascadeRowCell>
        </DataCascadeRow>
      </DataCascade>
    );
  }
);

export type CascadedDocumentsLayoutProps = Omit<
  ESQLDataCascadeProps,
  'togglePopover' | 'queryMeta'
>;

export const CascadedDocumentsLayout = React.memo(
  ({ dataView, ...props }: CascadedDocumentsLayoutProps) => {
    const { esqlQuery, esqlVariables, onUpdateESQLQuery } = useCascadedDocumentsContext();
    const { euiTheme } = useEuiTheme();
    const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);

    const styles = useMemo(() => cascadedDocumentsStyles({ euiTheme }), [euiTheme]);

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta(esqlQuery.esql);
    }, [esqlQuery]);

    const statsCommandBeingOperatedOn = useMemo(() => {
      const parsedQuery = EsqlQuery.fromSrc(esqlQuery.esql);
      return getStatsCommandToOperateOn(parsedQuery);
    }, [esqlQuery]);

    const { renderRowActionPopover, togglePopover } = useEsqlDataCascadeRowActionHelpers({
      dataView,
      esqlVariables,
      editorQuery: esqlQuery,
      statsFieldSummary: statsCommandBeingOperatedOn?.grouping,
      services: props.services,
      updateESQLQuery: onUpdateESQLQuery,
    });

    return (
      <div css={styles.wrapper} ref={cascadeWrapperRef}>
        <Fragment>{renderRowActionPopover(cascadeWrapperRef.current ?? undefined)}</Fragment>
        <ESQLDataCascade
          dataView={dataView}
          togglePopover={togglePopover}
          queryMeta={queryMeta}
          {...props}
        />
      </div>
    );
  }
);
