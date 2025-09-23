/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, Fragment } from 'react';
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
import type { DataTableRecord } from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useScopedServices } from '../../../../../components/scoped_services_provider/scoped_services_provider';
import { useAppStateSelector } from '../../../state_management/discover_app_state_container';
import { useCurrentTabSelector } from '../../../state_management/redux';
import { fetchEsql } from '../../../data_fetching/fetch_esql';
import { constructCascadeQuery, type CascadeQueryArgs, getESQLStatsQueryMeta } from './utils';
import {
  useEsqlDataCascadeRowHeaderComponents,
  useEsqlDataCascadeHeaderComponent,
  ESQLDataCascadeLeafCell,
} from './blocks';
import { esqlCascadeStyles } from './esql_data_cascade.styles';

export { getESQLStatsQueryMeta } from './utils';

interface ESQLDataCascadeProps extends Omit<UnifiedDataTableProps, 'ref'> {
  cascadeGroups: string[];
  defaultFilters?: Filter[];
  viewModeToggle?: React.ReactNode | null;
  // stateContainer: DiscoverStateContainer;
}

type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

export const ESQLDataCascade = React.memo(
  ({
    rows: initialData,
    cascadeGroups,
    dataView,
    viewModeToggle,
    ...props
  }: ESQLDataCascadeProps) => {
    const [query, defaultFilters] = useAppStateSelector((state) => [state.query, state.filters]);
    const globalState = useCurrentTabSelector((state) => state.globalState);
    const globalFilters = globalState?.filters;
    const globalTimeRange = globalState?.timeRange;
    const { euiTheme } = useEuiTheme();
    const { scopedProfilesManager } = useScopedServices();
    const { expressions } = useDiscoverServices();

    const queryMeta = useMemo(() => {
      return getESQLStatsQueryMeta((query as AggregateQuery).esql);
    }, [query]);

    const styles = useMemo(() => esqlCascadeStyles({ euiTheme }), [euiTheme]);

    const cascadeGroupData = useMemo(
      () =>
        (initialData ?? []).map((datum) => ({
          id: datum.id,
          ...datum.flattened,
        })),
      [initialData]
    );

    const onCascadeGroupingChange = useCallback(() => {
      /** no op */
    }, []);

    const customTableHeading = useEsqlDataCascadeHeaderComponent({ viewModeToggle });

    const { renderRowActionPopover, rowActions, rowHeaderMeta, rowHeaderTitle } =
      useEsqlDataCascadeRowHeaderComponents(props.services, queryMeta);

    const fetchCascadeData = useCallback(
      async ({ nodeType, nodePath, nodePathMap }: Omit<CascadeQueryArgs, 'query'>) => {
        const newQuery = constructCascadeQuery({
          query: query as AggregateQuery,
          nodeType,
          nodePath,
          nodePathMap,
        });

        const inspectorAdapters = { requests: new RequestAdapter() };

        const { records } = await fetchEsql({
          query: newQuery,
          dataView,
          data: props.services.data,
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
          inspectorAdapters,
        });

        return records;
      },
      [
        dataView,
        defaultFilters,
        expressions,
        globalFilters,
        globalTimeRange,
        props.services.data,
        query,
        scopedProfilesManager,
      ]
    );

    const onCascadeGroupNodeExpanded = useCallback<
      NonNullable<
        DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['onCascadeGroupNodeExpanded']
      >
    >(
      // @ts-expect-error - WIP to understand how data is structured
      ({ nodePath, nodePathMap }) => {
        return fetchCascadeData({
          nodePath,
          nodePathMap,
          nodeType: 'group',
        });
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

    const cascadeLeafRowRenderer = useCallback<
      DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']
    >(
      ({ data: cellData, cellId }) => (
        <ESQLDataCascadeLeafCell
          {...props}
          dataView={dataView}
          cellData={cellData!}
          queryMeta={queryMeta}
          cellId={cellId}
        />
      ),
      [dataView, props, queryMeta]
    );

    return (
      <div css={styles.wrapper}>
        <Fragment>{renderRowActionPopover()}</Fragment>
        <DataCascade<ESQLDataGroupNode>
          size="s"
          overscan={15}
          data={cascadeGroupData}
          cascadeGroups={cascadeGroups}
          customTableHeader={customTableHeading}
          onCascadeGroupingChange={onCascadeGroupingChange}
        >
          <DataCascadeRow<ESQLDataGroupNode>
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
      </div>
    );
  }
);
