/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface TimestampProps {
  timestamp?: string;
}

export function Timestamp({ timestamp }: TimestampProps) {
  if (!timestamp) return null;

  return (
    <EuiBadge color="hollow" data-test-subj="logsOverviewDocViewerLogTimestamp">
      {timestamp}
    </EuiBadge>
  );
}
