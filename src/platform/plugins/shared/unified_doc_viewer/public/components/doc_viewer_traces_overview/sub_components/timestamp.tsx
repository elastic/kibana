/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import moment from 'moment';

interface TimestampProps {
  timestamp: number;
}

export function Timestamp({ timestamp }: TimestampProps) {
  const momentTime = moment(timestamp);
  const relativeTime = momentTime.fromNow();
  const absoluteTime = momentTime.format('MMM D, YYYY @ HH:mm:ss');

  return (
    <EuiText size="xs" data-test-subj="docViewerTracesOverviewTimestamp">
      {absoluteTime} ({relativeTime})
    </EuiText>
  );
}
