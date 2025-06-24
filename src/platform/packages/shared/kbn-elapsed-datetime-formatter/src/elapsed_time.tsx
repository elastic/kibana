/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import { asAbsoluteDateTime, TimeUnit } from './datetime';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  /**
   * Threshold in hours to switch from relative to absolute time display
   * If not provided, it defaults to 2 hours
   */
  elapsedDisplayThreshold?: number;
  timeUnit?: TimeUnit;
}

export function getElapsedTimeText(duration: moment.Duration) {
  const [day, hour, minute] = [duration.days(), duration.hours(), duration.minutes()];
  // keeping days for flexibility, but it is not used in the current implementation. If day is detected, it will be displayed without hours or minutes
  if (day > 0) {
    return i18n.translate('xpack.observability.alertsTable.highFidelityDurationWithDays', {
      defaultMessage: '{day, plural, one {# day} other {# days}} ago',
      values: { day },
    });
  }
  if (hour > 0 && minute === 0) {
    return i18n.translate('xpack.observability.alertsTable.highFidelityDurationWithHours', {
      defaultMessage: '{hour, plural, one {# hour} other {# hours}} ago',
      values: { hour },
    });
  }
  if (hour > 0) {
    return i18n.translate(
      'xpack.observability.alertsTable.highFidelityDurationWithHoursAndMinutes',
      {
        defaultMessage:
          '{hour, plural, one {# hour} other {# hours}}, {minute, plural, one {# minute} other {# minutes}} ago',
        values: { hour, minute },
      }
    );
  }
  if (minute > 0) {
    return i18n.translate('xpack.observability.alertsTable.highFidelityDuration', {
      defaultMessage: '{minute, plural, one {# minute} other {# minutes}} ago',
      values: { minute },
    });
  }
  return i18n.translate('xpack.observability.alertsTable.highFidelityDurationRecently', {
    defaultMessage: 'a few seconds ago',
  });
}

export function ElapsedTimestampTooltip({
  time,
  elapsedDisplayThreshold = 24,
  timeUnit = 'milliseconds',
}: Props): JSX.Element {
  const duration = moment.duration(new Date().getTime() - time);
  const absoluteTimeLabel = asAbsoluteDateTime(time, timeUnit);

  const timeDisplay =
    duration.asHours() > elapsedDisplayThreshold ? absoluteTimeLabel : getElapsedTimeText(duration);

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{timeDisplay}</>
    </EuiToolTip>
  );
}
