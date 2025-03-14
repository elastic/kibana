/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, formatDate, EuiHorizontalRule } from '@elastic/eui';
import type { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import { css } from '@emotion/react';
import { MAINTENANCE_WINDOW_DATE_FORMAT } from '../constants';

const START_TIME = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.maintenanceWindowTooltip.startTime',
  {
    defaultMessage: 'Start',
  }
);

const END_TIME = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.maintenanceWindowTooltip.endTime',
  {
    defaultMessage: 'End',
  }
);

const textStyle = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

interface TooltipContentProps {
  maintenanceWindow: MaintenanceWindow;
  timestamp?: string;
}

export const TooltipContent = memo((props: TooltipContentProps) => {
  const { maintenanceWindow, timestamp } = props;
  const { title, events, eventStartTime, eventEndTime } = maintenanceWindow;

  const defaultEvent = useMemo(() => {
    return {
      gte: eventStartTime,
      lte: eventEndTime,
    };
  }, [eventStartTime, eventEndTime]);

  const event = useMemo(() => {
    if (!timestamp) {
      return defaultEvent;
    }
    const time = events.find(({ gte, lte }) => {
      return moment(timestamp).isBetween(gte, lte, undefined, '[]');
    });
    return time || defaultEvent;
  }, [events, timestamp, defaultEvent]);

  return (
    <EuiFlexGroup
      data-test-subj="maintenance-window-tooltip-content"
      gutterSize="xs"
      direction="column"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="relative" css={textStyle}>
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiHorizontalRule margin="none" />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" direction="row">
          <EuiFlexItem grow={false}>
            <EuiText size="relative">{START_TIME}:</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="relative">
              {formatDate(event.gte, MAINTENANCE_WINDOW_DATE_FORMAT)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" direction="row">
          <EuiFlexItem grow={false}>
            <EuiText size="relative">{END_TIME}:</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="relative">
              {formatDate(event.lte, MAINTENANCE_WINDOW_DATE_FORMAT)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
