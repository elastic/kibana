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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { GroupStatsItem } from '../types';
import { TAKE_ACTION } from '../translations';

type GetActionItems = (args: { closePopover: () => void }) => JSX.Element | undefined;

interface GroupStatsProps<T> {
  bucketKey: string;
  onTakeActionsOpen?: () => void;
  stats?: GroupStatsItem[];
  getActionItems?: GetActionItems;
  /** Optional array of additional action buttons to display before the Take actions button */
  additionalActionButtons?: React.ReactElement[];
}

const Separator = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem
      grow={false}
      role="separator"
      css={css`
        align-self: center;
        height: 20px;
        border-right: ${euiTheme.border.thin};
      `}
    />
  );
};

const GroupStatsComponent = <T,>({
  bucketKey,
  onTakeActionsOpen,
  stats,
  getActionItems,
  additionalActionButtons,
}: GroupStatsProps<T>) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const [isPopoverOpen, setPopover] = useState(false);

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
                      tabIndex={0}
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
            <span
              css={css`
                font-size: ${xsFontSize};
                font-weight: ${euiTheme.font.weight.semiBold};
                .smallDot {
                  width: 3px !important;
                  display: inline-block;
                }
                .euiBadge__text {
                  text-align: center;
                  width: 100%;
                }
              `}
              data-test-subj={dataTestSubj}
            >
              {stat.title}
              {component}
            </span>
          </EuiFlexItem>
        );
      }) ?? [],
    [stats, euiTheme, xsFontSize]
  );

  const additionalActionButtonsComponents = useMemo(
    () =>
      additionalActionButtons?.map((button, index) => (
        <EuiFlexItem grow={false} key={`additional-action-button-${index}`}>
          {button}
        </EuiFlexItem>
      )) ?? [],
    [additionalActionButtons]
  );

  const actionItems = useMemo(
    () =>
      getActionItems?.({
        closePopover: () => {
          setPopover(false);
        },
      }),
    [getActionItems]
  );

  const takeActionMenu = useMemo(
    () =>
      actionItems ? (
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
            {actionItems}
          </EuiPopover>
        </EuiFlexItem>
      ) : null,
    [isPopoverOpen, onButtonClick, actionItems]
  );

  return (
    <EuiFlexGroup
      data-test-subj="group-stats"
      key={`stats-${bucketKey}`}
      gutterSize="m"
      alignItems="center"
    >
      {[...statsComponents, ...additionalActionButtonsComponents, takeActionMenu]
        .filter(Boolean)
        .map((component, index, { length }) => (
          <Fragment key={index}>
            {component}
            {index < length - 1 && <Separator />}
          </Fragment>
        ))}
    </EuiFlexGroup>
  );
};

export const GroupStats = React.memo(GroupStatsComponent);
