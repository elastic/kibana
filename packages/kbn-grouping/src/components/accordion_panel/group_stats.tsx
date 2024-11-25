/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { Filter } from '@kbn/es-query';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { GroupStatsItem } from '../types';
import { statsContainerCss } from '../styles';
import { TAKE_ACTION } from '../translations';

interface GroupStatsProps<T> {
  bucketKey: string;
  groupFilter: Filter[];
  groupNumber: number;
  onTakeActionsOpen?: () => void;
  stats?: GroupStatsItem[];
  takeActionItems?: (groupFilters: Filter[], groupNumber: number) => JSX.Element[];
}

const Separator = () => {
  return (
    <EuiFlexItem
      grow={false}
      role="separator"
      css={css`
        align-self: center;
        height: 20px;
        border-right: ${euiThemeVars.euiBorderThin};
      `}
    />
  );
};

const GroupStatsComponent = <T,>({
  bucketKey,
  groupFilter,
  groupNumber,
  onTakeActionsOpen,
  stats,
  takeActionItems: getTakeActionItems,
}: GroupStatsProps<T>) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const takeActionItems = useMemo(() => {
    return getTakeActionItems?.(groupFilter, groupNumber) ?? [];
  }, [getTakeActionItems, groupFilter, groupNumber]);

  const onButtonClick = useCallback(() => {
    return !isPopoverOpen && onTakeActionsOpen ? onTakeActionsOpen() : setPopover(!isPopoverOpen);
  }, [isPopoverOpen, onTakeActionsOpen]);

  const statsComponents = useMemo(
    () =>
      stats?.map((stat) => {
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
            : { dataTestSubj: `customMetric-${stat.title}`, component: stat.component };

        return (
          <EuiFlexItem grow={false} key={stat.title}>
            <span css={statsContainerCss} data-test-subj={dataTestSubj}>
              {stat.title}
              {component}
            </span>
          </EuiFlexItem>
        );
      }) ?? [],
    [stats]
  );

  const takeActionMenu = useMemo(
    () =>
      takeActionItems.length ? (
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
      ) : null,
    [isPopoverOpen, onButtonClick, takeActionItems]
  );

  return (
    <EuiFlexGroup
      data-test-subj="group-stats"
      key={`stats-${bucketKey}`}
      gutterSize="m"
      alignItems="center"
    >
      {[...statsComponents, takeActionMenu].filter(Boolean).map((component, index, { length }) => (
        <Fragment key={index}>
          {component}
          {index < length - 1 && <Separator />}
        </Fragment>
      ))}
    </EuiFlexGroup>
  );
};

export const GroupStats = React.memo(GroupStatsComponent);
