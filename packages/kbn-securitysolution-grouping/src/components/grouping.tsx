/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiTablePagination,
} from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import React, { useMemo, useState } from 'react';
import { defaultUnit, firstNonNullValue } from '../helpers';
import { createGroupFilter } from './accordion_panel/helpers';
import type { BadgeMetric, CustomMetric } from './accordion_panel';
import { GroupPanel } from './accordion_panel';
import { GroupStats } from './accordion_panel/group_stats';
import { EmptyGroupingComponent } from './empty_results_panel';
import { groupingContainerCss, groupingContainerCssLevel, groupsUnitCountCss } from './styles';
import { GROUPS_UNIT } from './translations';
import type { GroupingAggregation, GroupingFieldTotalAggregation, RawBucket } from './types';
import { GroupsPagingSettingsById } from '../hooks/types';

export interface GroupingProps<T> {
  badgeMetricStats?: (fieldBucket: RawBucket<T>) => BadgeMetric[];
  customMetricStats?: (fieldBucket: RawBucket<T>) => CustomMetric[];
  data?: GroupingAggregation<T> & GroupingFieldTotalAggregation;
  groupPanelRenderer?: (fieldBucket: RawBucket<T>) => JSX.Element | undefined;
  inspectButton?: JSX.Element;
  isLoading: boolean;
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  selectedGroup: string;
  takeActionItems: (groupFilters: Filter[]) => JSX.Element[];
  unit?: (n: number) => string;
  pagination: {
    pagingSettings: GroupsPagingSettingsById;
    onChangeItemsPerPage: (newItemsPerPage: number, selectedGroup: string) => void;
    onChangePage: (newActivePage: number, selectedGroup: string) => void;
    itemsPerPageOptions: number[];
  };
  groupingLevel?: number;
}

const GroupingComponent = <T,>({
  badgeMetricStats,
  customMetricStats,
  data,
  groupPanelRenderer,
  inspectButton,
  isLoading,
  renderChildComponent,
  selectedGroup,
  takeActionItems,
  unit = defaultUnit,
  pagination,
  groupingLevel = 0,
}: GroupingProps<T>) => {
  const [trigger, setTrigger] = useState<
    Record<string, { state: 'open' | 'closed' | undefined; selectedBucket: RawBucket<T> }>
  >({});
  const groupsNumber = data?.groupsNumber?.value ?? 0;
  const unitCountText = useMemo(() => {
    const count = data?.alertsCount?.value ?? 0;
    return `${count.toLocaleString()} ${unit && unit(count)}`;
  }, [data?.alertsCount?.value, unit]);

  const unitGroupsCountText = useMemo(
    () => `${groupsNumber.toLocaleString()} ${GROUPS_UNIT(groupsNumber)}`,
    [groupsNumber]
  );

  const groupPanels = useMemo(
    () =>
      data?.groupByFields?.buckets?.map((groupBucket) => {
        const group = firstNonNullValue(groupBucket.key);
        const groupKey = `group0-${group}`;

        return (
          <span key={groupKey}>
            <GroupPanel
              extraAction={
                <GroupStats
                  bucket={groupBucket}
                  takeActionItems={takeActionItems(createGroupFilter(selectedGroup, group))}
                  badgeMetricStats={badgeMetricStats && badgeMetricStats(groupBucket)}
                  customMetricStats={customMetricStats && customMetricStats(groupBucket)}
                />
              }
              forceState={(trigger[groupKey] && trigger[groupKey].state) ?? 'closed'}
              groupBucket={groupBucket}
              groupPanelRenderer={groupPanelRenderer && groupPanelRenderer(groupBucket)}
              isLoading={isLoading}
              onToggleGroup={(isOpen) => {
                setTrigger({
                  // ...trigger, -> this change will keep only one group at a time expanded and one table displayed
                  [groupKey]: {
                    state: isOpen ? 'open' : 'closed',
                    selectedBucket: groupBucket,
                  },
                });
              }}
              renderChildComponent={
                trigger[groupKey] && trigger[groupKey].state === 'open'
                  ? renderChildComponent
                  : () => null
              }
              selectedGroup={selectedGroup}
              groupingLevel={groupingLevel}
            />
            {groupingLevel > 0 ? null : <EuiSpacer size="s" />}
          </span>
        );
      }),
    [
      badgeMetricStats,
      customMetricStats,
      data?.groupByFields?.buckets,
      groupPanelRenderer,
      isLoading,
      renderChildComponent,
      selectedGroup,
      takeActionItems,
      trigger,
      groupingLevel,
    ]
  );
  const groupPageSize = pagination.pagingSettings[selectedGroup].itemsPerPage ?? 25;
  const groupPageIndex = pagination.pagingSettings[selectedGroup].activePage ?? 0;
  const pageCount = useMemo(
    () => (groupsNumber && groupPageSize ? Math.ceil(groupsNumber / groupPageSize) : 1),
    [groupsNumber, groupPageSize]
  );
  return (
    <>
      {groupingLevel > 0 ? null : (
        <EuiFlexGroup
          data-test-subj="grouping-table"
          justifyContent="spaceBetween"
          alignItems="center"
          style={{ paddingBottom: 20, paddingTop: 20 }}
        >
          <EuiFlexItem grow={false}>
            {groupsNumber > 0 ? (
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem grow={false}>
                  <span css={groupsUnitCountCss} data-test-subj="alert-count">
                    {unitCountText}
                  </span>
                </EuiFlexItem>
                <EuiFlexItem>
                  <span
                    css={groupsUnitCountCss}
                    data-test-subj="groups-count"
                    style={{ borderRight: 'none' }}
                  >
                    {unitGroupsCountText}
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              {inspectButton && <EuiFlexItem>{inspectButton}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div
        css={groupingLevel > 0 ? groupingContainerCssLevel : groupingContainerCss}
        className="eui-xScroll"
      >
        {groupsNumber > 0 ? (
          <>
            {groupPanels}
            {groupingLevel > 0 && pageCount === 1 ? null : (
              <>
                <EuiSpacer size="m" />
                <EuiTablePagination
                  activePage={groupPageIndex}
                  data-test-subj="grouping-table-pagination"
                  itemsPerPage={groupPageSize}
                  itemsPerPageOptions={pagination.itemsPerPageOptions}
                  onChangeItemsPerPage={(pageSize: number) =>
                    pagination.onChangeItemsPerPage(pageSize, selectedGroup)
                  }
                  onChangePage={(pageIndex: number) =>
                    pagination.onChangePage(pageIndex, selectedGroup)
                  }
                  pageCount={pageCount}
                  showPerPageOptions
                />
              </>
            )}
          </>
        ) : (
          <>
            {isLoading && (
              <EuiProgress data-test-subj="is-loading-grouping-table" size="xs" color="accent" />
            )}
            <EmptyGroupingComponent />
          </>
        )}
      </div>
    </>
  );
};

export const Grouping = React.memo(GroupingComponent) as typeof GroupingComponent;
