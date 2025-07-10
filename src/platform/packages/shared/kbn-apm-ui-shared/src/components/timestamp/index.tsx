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
import { EuiInlineEditTextSizes } from '@elastic/eui/src/components/inline_edit/inline_edit_text';
import { TimeUnit, asAbsoluteDateTime } from '../../utils/formatters/datetime';

interface TimestampProps {
  timestamp: number;
  renderMode?: 'tooltip' | 'inline';
  timeUnit?: TimeUnit;
  size?: EuiInlineEditTextSizes;
}

export function Timestamp({
  timestamp,
  renderMode = 'inline',
  timeUnit = 'milliseconds',
  size = 's',
}: TimestampProps) {
  const momentTime = moment(timestamp);
  const relativeTime = momentTime.fromNow();
  const absoluteTime = asAbsoluteDateTime(timestamp, timeUnit);

  return renderMode === 'inline' ? (
    <EuiText size={size} data-test-subj="apmUiSharedTimestamp">
      {absoluteTime} ({relativeTime})
    </EuiText>
  ) : (
    <EuiToolTip content={absoluteTime} data-test-subj="apmUiSharedTimestampTooltip">
      <>{relativeTime}</>
    </EuiToolTip>
  );
}
