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
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { defaultUnit, firstNonNullValue } from '../helpers';
import { createGroupFilter, getNullGroupFilter } from '../containers/query/helpers';
import { GroupPanel } from './accordion_panel';
import { GroupStats } from './accordion_panel/group_stats';
import { EmptyGroupingComponent } from './empty_results_panel';
import { countCss, groupingContainerCss, groupingContainerCssLevel } from './styles';
import { GROUPS_UNIT, NULL_GROUP } from './translations';
import type { ParsedGroupingAggregation, GroupPanelRenderer, GetGroupStats } from './types';
import { GroupingBucket, OnGroupToggle } from './types';
import { getTelemetryEvent } from '../telemetry/const';

export interface GroupingProps<T> {
  activePage: number;
  data?: ParsedGroupingAggregation<T>;
  groupPanelRenderer?: GroupPanelRenderer<T>;
  groupSelector?: JSX.Element;
  // list of custom UI components which correspond to your custom rendered metrics aggregations
  getGroupStats?: GetGroupStats<T>;
  groupingId: string;
  groupingLevel?: number;
  inspectButton?: JSX.Element;
  isLoading: boolean;
  itemsPerPage: number;
  onChangeGroupsItemsPerPage?: (size: number) => void;
  onChangeGroupsPage?: (index: number) => void;
  onGroupToggle?: OnGroupToggle;
  renderChildComponent: (groupFilter: Filter[]) => React.ReactElement;
  onGroupClose: () => void;
  selectedGroup: string;
  takeActionItems?: (groupFilters: Filter[], groupNumber: number) => JSX.Element[];
  tracker?: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
  unit?: (n: number) => string;
  groupsUnit?: (n: number, parentSelectedGroup: string, hasNullGroup: boolean) => string;
}

const GroupingComponent = <T,>({
  activePage,
  data,
  groupPanelRenderer,
  getGroupStats,
  groupSelector,
  groupingId,
  groupingLevel = 0,
  inspectButton,
  isLoading,
  itemsPerPage,
  onChangeGroupsItemsPerPage,
  onChangeGroupsPage,
  onGroupClose,
  onGroupToggle,
  renderChildComponent,
  selectedGroup,
  takeActionItems,
  tracker,
  unit = defaultUnit,
  groupsUnit = GROUPS_UNIT,
}: GroupingProps<T>) => {
  const [trigger, setTrigger] = useState<Record<string, { state: 'open' | 'closed' | undefined }>>(
    {}
  );

  const unitCount = useMemo(() => data?.unitsCount?.value ?? 0, [data?.unitsCount?.value]);
  const unitCountText = useMemo(() => {
    return `${unitCount.toLocaleString()} ${unit && unit(unitCount)}`;
  }, [unitCount, unit]);

  const groupCount = useMemo(() => data?.groupsCount?.value ?? 0, [data?.groupsCount?.value]);
  const groupCountText = useMemo(() => {
    const hasNullGroup =
      data?.groupByFields?.buckets?.some(
        (groupBucket: GroupingBucket<T>) => groupBucket.isNullGroup
      ) || false;

    return `${groupsUnit(groupCount, selectedGroup, hasNullGroup)}`;
  }, [data?.groupByFields?.buckets, groupCount, groupsUnit, selectedGroup]);

  const groupPanels = useMemo(
    () =>
      data?.groupByFields?.buckets?.map((groupBucket: GroupingBucket<T>, groupNumber) => {
        const group = firstNonNullValue(groupBucket.key);
        const groupKey = `group-${groupNumber}-${group}`;
        const isNullGroup = groupBucket.isNullGroup ?? false;
        const nullGroupMessage = isNullGroup
          ? NULL_GROUP(selectedGroup, unit(groupBucket.doc_count))
          : undefined;

        return (
          <span key={groupKey} data-test-subj={`level-${groupingLevel}-group-${groupNumber}`}>
            <GroupPanel
              isNullGroup={isNullGroup}
              nullGroupMessage={nullGroupMessage}
              onGroupClose={onGroupClose}
              extraAction={
                <GroupStats
                  bucketKey={groupKey}
                  groupFilter={
                    isNullGroup
                      ? getNullGroupFilter(selectedGroup)
                      : createGroupFilter(
                          selectedGroup,
                          Array.isArray(groupBucket.key) ? groupBucket.key : [groupBucket.key]
                        )
                  }
                  groupNumber={groupNumber}
                  stats={getGroupStats && getGroupStats(selectedGroup, groupBucket)}
                  takeActionItems={takeActionItems}
                />
              }
              forceState={(trigger[groupKey] && trigger[groupKey].state) ?? 'closed'}
              groupBucket={groupBucket}
              groupPanel={
                groupPanelRenderer &&
                groupPanelRenderer(selectedGroup, groupBucket, nullGroupMessage, isLoading)
              }
              isLoading={isLoading}
              onToggleGroup={(isOpen) => {
                // built-in telemetry: UI-counter
                tracker?.(
                  METRIC_TYPE.CLICK,
                  getTelemetryEvent.groupToggled({ isOpen, groupingId, groupNumber })
                );
                setTrigger({
                  // ...trigger, -> this change will keep only one group at a time expanded and one table displayed
                  [groupKey]: {
                    state: isOpen ? 'open' : 'closed',
                  },
                });
                onGroupToggle?.({ isOpen, groupName: group, groupNumber, groupingId });
              }}
              renderChildComponent={
                trigger[groupKey] && trigger[groupKey].state === 'open'
                  ? renderChildComponent
                  : () => <span />
              }
              selectedGroup={selectedGroup}
              groupingLevel={groupingLevel}
            />
            {groupingLevel > 0 ? null : <EuiSpacer size="s" />}
          </span>
        );
      }),
    [
      data?.groupByFields?.buckets,
      groupPanelRenderer,
      getGroupStats,
      groupingId,
      groupingLevel,
      isLoading,
      onGroupClose,
      onGroupToggle,
      renderChildComponent,
      selectedGroup,
      takeActionItems,
      tracker,
      trigger,
      unit,
    ]
  );

  const pageCount = useMemo(
    () => (groupCount ? Math.ceil(groupCount / itemsPerPage) : 1),
    [groupCount, itemsPerPage]
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
      )}
      <div
        css={groupingLevel > 0 ? groupingContainerCssLevel : groupingContainerCss}
        className="eui-xScroll"
      >
        {isLoading && (
          <EuiProgress data-test-subj="is-loading-grouping-table" size="xs" color="accent" />
        )}
        {groupCount > 0 ? (
          <span data-test-subj={`grouping-level-${groupingLevel}`}>
            {groupPanels}
            {groupCount > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiTablePagination
                  activePage={activePage}
                  data-test-subj={`grouping-level-${groupingLevel}-pagination`}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={[10, 25, 50, 100]}
                  onChangeItemsPerPage={(pageSize: number) => {
                    if (onChangeGroupsItemsPerPage) {
                      onChangeGroupsItemsPerPage(pageSize);
                    }
                  }}
                  onChangePage={(pageIndex: number) => {
                    if (onChangeGroupsPage) {
                      onChangeGroupsPage(pageIndex);
                    }
                  }}
                  pageCount={pageCount}
                  showPerPageOptions
                />
              </>
            )}
          </span>
        ) : (
          <EmptyGroupingComponent />
        )}
      </div>
    </>
  );
};

export const Grouping = React.memo(GroupingComponent) as typeof GroupingComponent;
