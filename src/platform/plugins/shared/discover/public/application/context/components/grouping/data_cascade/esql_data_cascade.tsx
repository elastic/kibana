/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { type AggregateQuery } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  EuiText,
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  type HorizontalAlignment,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useScopedServices } from '../../../../../components/scoped_services_provider/scoped_services_provider';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../../../main/state_management/discover_app_state_container';
import type { DiscoverStateContainer } from '../../../../main/state_management/discover_state';
import { fetchEsql } from '../../../../main/data_fetching/fetch_esql';
import { constructCascadeQuery, type CascadeQueryArgs, getESQLStatsQueryMeta } from './util';
import { getPatternCellRenderer } from '../../../../../context_awareness/profile_providers/common/patterns/pattern_cell_renderer';

export { getESQLStatsQueryMeta } from './util';

const DEFAULT_FILTERS: Filter[] = [];

interface ESQLDataCascadeProps {
  initialData: DataTableRecord[];
  cascadeGroups: string[];
  dataView: DataView;
  defaultFilters?: Filter[];
  onGroupClose: () => void;
  stateContainer: DiscoverStateContainer;
}

export const ESQLDataCascade = ({
  initialData,
  cascadeGroups,
  dataView,
  stateContainer,
  onGroupClose,
  defaultFilters = DEFAULT_FILTERS,
}: ESQLDataCascadeProps) => {
  const globalState = stateContainer.globalState.get();
  const globalFilters = globalState?.filters;
  const globalTimeRange = globalState?.time;
  const [query] = useAppStateSelector((state) => [state.query]);
  const { data, expressions } = useDiscoverServices();
  const { scopedProfilesManager } = useScopedServices();

  const queryMeta = useMemo(() => {
    return getESQLStatsQueryMeta((query as AggregateQuery).esql);
  }, [query]);

  type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

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
        data,
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
      data,
      dataView,
      defaultFilters,
      expressions,
      globalFilters,
      globalTimeRange,
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

  return (
    <div
      css={({ euiTheme }) => ({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: euiTheme.size.s,
      })}
    >
      <DataCascade<ESQLDataGroupNode>
        stickyGroupRoot
        data={initialData.map((datum) => ({
          id: datum.id,
          ...datum.flattened,
        }))}
        cascadeGroups={cascadeGroups}
        tableTitleSlot={({ rows }) => (
          <EuiText>
            {i18n.translate('discover.esql_data_cascade.toolbar.query_string', {
              defaultMessage: '{entitiesCount} {entitiesAlias} | {groupCount} groups',
              values: {
                entitiesCount: Infinity,
                groupCount: rows.length - 1,
                entitiesAlias: 'documents',
              },
            })}
          </EuiText>
        )}
        onCascadeGroupingChange={() => {}}
      >
        <DataCascadeRow<ESQLDataGroupNode>
          rowHeaderTitleSlot={({ row }) => {
            if (/categorize/i.test(cascadeGroups[row.depth])) {
              return (
                <React.Fragment>
                  {getPatternCellRenderer(
                    // @ts-expect-error - necessary to match the data shape expectation
                    { flattened: row.original },
                    cascadeGroups[row.depth],
                    false,
                    48
                  )}
                </React.Fragment>
              );
            }

            return (
              <EuiText size="s">
                <h4>{row.original[cascadeGroups[row.depth]] as string}</h4>
              </EuiText>
            );
          }}
          rowHeaderMetaSlots={({ row }) =>
            queryMeta.appliedFunctions.map(({ identifier, operator }) => {
              // maybe use operator to determine what meta component to render
              return (
                <EuiText size="s" textAlign="right">
                  <p>
                    <FormattedMessage
                      id="discover.esql_data_cascade.grouping.function"
                      defaultMessage="{identifier} <badge>{identifierValue}</badge>"
                      values={{
                        identifier,
                        identifierValue: row.original[identifier] as string,
                        badge: (chunks) => <EuiBadge color="hollow">{chunks}</EuiBadge>,
                      }}
                    />
                  </p>
                </EuiText>
              );
            })
          }
          rowHeaderActions={({ row }) => [
            <EuiButtonIcon
              aria-label={i18n.translate('discover.esql_data_cascade.grouping.expand', {
                defaultMessage: 'Expand {groupValue} group',
                values: {
                  groupValue: row.original[cascadeGroups[row.depth]] as string,
                },
              })}
              iconType="expand"
            />,
            <EuiButtonIcon
              aria-label={i18n.translate('discover.esql_data_cascade.grouping.more_options', {
                defaultMessage: 'Select More options',
                values: {
                  groupValue: row.original[cascadeGroups[row.depth]] as string,
                },
              })}
              iconType="boxesVertical"
            />,
          ]}
          onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
        >
          <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
            {({ data: cellData }) => {
              return (
                <EuiBasicTable
                  columns={[
                    ...queryMeta.groupByFields.map((field, index, groupArray) => ({
                      field,
                      name: field.replace(/_/g, ' '),
                      ...(index === groupArray.length - 1
                        ? { align: 'right' as HorizontalAlignment }
                        : {}),
                    })),
                  ]}
                  items={(cellData ?? []).map((datum) => ({
                    id: datum.id,
                    ...queryMeta.groupByFields.reduce(
                      (acc, field) => ({
                        ...acc,
                        [field]: datum.flattened[field] as string,
                      }),
                      {} as Record<string, string>
                    ),
                  }))}
                />
              );
            }}
          </DataCascadeRowCell>
        </DataCascadeRow>
      </DataCascade>
    </div>
  );
};
