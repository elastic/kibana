/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import { TimeUnit } from '@kbn/apm-types-shared';
import { asAbsoluteDateTime } from '../../utils/formatters/datetime';

interface TimestampProps {
  timestamp: number;
  absoluteTimeType?: 'tooltip' | 'inline';
  timeUnit?: TimeUnit;
}

export function Timestamp({
  timestamp,
  absoluteTimeType = 'inline',
  timeUnit = 'milliseconds',
}: TimestampProps) {
  const momentTime = moment(timestamp);
  const relativeTime = momentTime.fromNow();
  const absoluteTime = asAbsoluteDateTime(timestamp, timeUnit);

  return absoluteTimeType ? (
    <EuiText size="xs" data-test-subj="unifiedDocViewerObservabilityTracesTimestamp">
      {absoluteTime} ({relativeTime})
    </EuiText>
  ) : (
    <EuiToolTip content={absoluteTime}>
      <>{relativeTime}</>
    </EuiToolTip>
  );
}
