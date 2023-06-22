/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { Filter } from '@kbn/es-query';
import { StatRenderer } from '../types';
import { statsContainerCss } from '../styles';
import { TAKE_ACTION } from '../translations';

interface GroupStatsProps<T> {
  bucketKey: string;
  groupFilter: Filter[];
  groupNumber: number;
  onTakeActionsOpen?: () => void;
  statRenderers?: StatRenderer[];
  takeActionItems: (groupFilters: Filter[], groupNumber: number) => JSX.Element[];
}

const GroupStatsComponent = <T,>({
  bucketKey,
  groupFilter,
  groupNumber,
  onTakeActionsOpen,
  statRenderers,
  takeActionItems: getTakeActionItems,
}: GroupStatsProps<T>) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [takeActionItems, setTakeActionItems] = useState<JSX.Element[]>([]);

  const onButtonClick = useCallback(() => {
    if (!isPopoverOpen && takeActionItems.length === 0) {
      setTakeActionItems(getTakeActionItems(groupFilter, groupNumber));
    }
    return !isPopoverOpen && onTakeActionsOpen ? onTakeActionsOpen() : setPopover(!isPopoverOpen);
  }, [
    getTakeActionItems,
    groupFilter,
    groupNumber,
    isPopoverOpen,
    onTakeActionsOpen,
    takeActionItems.length,
  ]);

  const statsComponent = useMemo(
    () =>
      statRenderers?.map((stat) => {
        const { dataTestSubj, component } =
          stat.badge != null
            ? {
                dataTestSubj: `metric-${stat.title}`,
                component: (
                  <EuiToolTip position="top" content={stat.badge.value}>
                    <EuiBadge
                      style={{ marginLeft: 10, width: stat.badge.width ?? 35 }}
                      color={stat.badge.color ?? 'hollow'}
                    >
                      {stat.badge.value > 99 ? '99+' : stat.badge.value.toString()}
                    </EuiBadge>
                  </EuiToolTip>
                ),
              }
            : { dataTestSubj: `customMetric-${stat.title}`, component: stat.renderer };

        return (
          <EuiFlexItem grow={false} key={stat.title}>
            <span css={statsContainerCss} data-test-subj={dataTestSubj}>
              {stat.title}
              {component}
            </span>
          </EuiFlexItem>
        );
      }),
    [statRenderers]
  );

  const takeActionMenu = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downLeft"
          button={
            <EuiButtonEmpty
              data-test-subj="take-action-button"
              onClick={onButtonClick}
              iconType="arrowDown"
              iconSide="right"
            >
              {TAKE_ACTION}
            </EuiButtonEmpty>
          }
          closePopover={() => setPopover(false)}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel items={takeActionItems} />
        </EuiPopover>
      </EuiFlexItem>
    ),
    [isPopoverOpen, onButtonClick, takeActionItems]
  );

  return (
    <EuiFlexGroup
      data-test-subj="group-stats"
      key={`stats-${bucketKey}`}
      gutterSize="none"
      alignItems="center"
    >
      {statsComponent}
      {takeActionMenu}
    </EuiFlexGroup>
  );
};

export const GroupStats = React.memo(GroupStatsComponent);
