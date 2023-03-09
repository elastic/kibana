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
import { groupingContainerCss, countCss } from './styles';
import { GROUPS_UNIT } from './translations';
import type { GroupingAggregation, GroupingFieldTotalAggregation, RawBucket } from './types';

export interface GroupingProps<T> {
  badgeMetricStats?: (fieldBucket: RawBucket<T>) => BadgeMetric[];
  customMetricStats?: (fieldBucket: RawBucket<T>) => CustomMetric[];
  data?: GroupingAggregation<T> & GroupingFieldTotalAggregation;
  groupPanelRenderer?: (fieldBucket: RawBucket<T>) => JSX.Element | undefined;
  groupSelector?: JSX.Element;
  inspectButton?: JSX.Element;
  isLoading: boolean;
  pagination: {
    pageIndex: number;
    pageSize: number;
    onChangeItemsPerPage: (itemsPerPageNumber: number) => void;
    onChangePage: (pageNumber: number) => void;
    itemsPerPageOptions: number[];
  };
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  selectedGroup: string;
  takeActionItems: (groupFilters: Filter[]) => JSX.Element[];
  unit?: (n: number) => string;
}

const GroupingComponent = <T,>({
  badgeMetricStats,
  customMetricStats,
  data,
  groupPanelRenderer,
  groupSelector,
  inspectButton,
  isLoading,
  pagination,
  renderChildComponent,
  selectedGroup,
  takeActionItems,
  unit = defaultUnit,
}: GroupingProps<T>) => {
  const [trigger, setTrigger] = useState<
    Record<string, { state: 'open' | 'closed' | undefined; selectedBucket: RawBucket<T> }>
  >({});

  const unitCount = data?.unitCount0?.value ?? 0;
  const unitCountText = useMemo(() => {
    return `${unitCount.toLocaleString()} ${unit && unit(unitCount)}`;
  }, [unitCount, unit]);

  const groupCount = data?.groupCount0?.value ?? 0;
  const groupCountText = useMemo(
    () => `${groupCount.toLocaleString()} ${GROUPS_UNIT(groupCount)}`,
    [groupCount]
  );

  const groupPanels = useMemo(
    () =>
      data?.stackByMultipleFields0?.buckets?.map((groupBucket) => {
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
            />
            <EuiSpacer size="s" />
          </span>
        );
      }),
    [
      badgeMetricStats,
      customMetricStats,
      data?.stackByMultipleFields0?.buckets,
      groupPanelRenderer,
      isLoading,
      renderChildComponent,
      selectedGroup,
      takeActionItems,
      trigger,
    ]
  );
  const pageCount = useMemo(
    () => (groupCount && pagination.pageSize ? Math.ceil(groupCount / pagination.pageSize) : 1),
    [groupCount, pagination.pageSize]
  );
  return (
    <>
      <EuiFlexGroup
        data-test-subj="grouping-table"
        justifyContent="spaceBetween"
        alignItems="center"
        style={{ paddingBottom: 20, paddingTop: 20 }}
      >
        <EuiFlexItem grow={false}>
          {groupCount > 0 && unitCount > 0 ? (
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <span css={countCss} data-test-subj="unit-count">
                  {unitCountText}
                </span>
              </EuiFlexItem>
              <EuiFlexItem>
                <span css={countCss} data-test-subj="group-count" style={{ borderRight: 'none' }}>
                  {groupCountText}
                </span>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            {inspectButton && <EuiFlexItem>{inspectButton}</EuiFlexItem>}
            <EuiFlexItem>{groupSelector}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div css={groupingContainerCss} className="eui-xScroll">
        {groupCount > 0 ? (
          <>
            {groupPanels}
            <EuiSpacer size="m" />
            <EuiTablePagination
              activePage={pagination.pageIndex}
              data-test-subj="grouping-table-pagination"
              itemsPerPage={pagination.pageSize}
              itemsPerPageOptions={pagination.itemsPerPageOptions}
              onChangeItemsPerPage={pagination.onChangeItemsPerPage}
              onChangePage={pagination.onChangePage}
              pageCount={pageCount}
              showPerPageOptions
            />
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
