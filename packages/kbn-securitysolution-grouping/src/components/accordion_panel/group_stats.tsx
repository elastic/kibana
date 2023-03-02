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
import type { BadgeMetric, CustomMetric } from '.';
import { statsContainerCss } from '../styles';
import { TAKE_ACTION } from '../translations';
import type { RawBucket } from '../types';

interface GroupStatsProps<T> {
  badgeMetricStats?: BadgeMetric[];
  bucket: RawBucket<T>;
  customMetricStats?: CustomMetric[];
  onTakeActionsOpen?: () => void;
  takeActionItems: JSX.Element[];
}

const GroupStatsComponent = <T,>({
  badgeMetricStats,
  bucket,
  customMetricStats,
  onTakeActionsOpen,
  takeActionItems,
}: GroupStatsProps<T>) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = useCallback(
    () => (!isPopoverOpen && onTakeActionsOpen ? onTakeActionsOpen() : setPopover(!isPopoverOpen)),
    [isPopoverOpen, onTakeActionsOpen]
  );

  const badgesComponents = useMemo(
    () =>
      badgeMetricStats?.map((metric) => (
        <EuiFlexItem grow={false} key={metric.title}>
          <span css={statsContainerCss} data-test-subj={`metric-${metric.title}`}>
            <>
              {metric.title}
              <EuiToolTip position="top" content={metric.value}>
                <EuiBadge
                  style={{ marginLeft: 10, width: metric.width ?? 35 }}
                  color={metric.color ?? 'hollow'}
                >
                  {metric.value > 99 ? '99+' : metric.value.toString()}
                </EuiBadge>
              </EuiToolTip>
            </>
          </span>
        </EuiFlexItem>
      )),
    [badgeMetricStats]
  );

  const customComponents = useMemo(
    () =>
      customMetricStats?.map((customMetric) => (
        <EuiFlexItem grow={false} key={customMetric.title}>
          <span css={statsContainerCss} data-test-subj={`customMetric-${customMetric.title}`}>
            {customMetric.title}
            {customMetric.customStatRenderer}
          </span>
        </EuiFlexItem>
      )),
    [customMetricStats]
  );

  const popoverComponent = useMemo(
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
      key={`stats-${bucket.key[0]}`}
      gutterSize="none"
      alignItems="center"
    >
      {customComponents}
      {badgesComponents}
      {popoverComponent}
    </EuiFlexGroup>
  );
};

export const GroupStats = React.memo(GroupStatsComponent);
