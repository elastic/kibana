/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

interface MetricsCountProps {
  count: number;
}

export const MetricsCount = ({ count }: MetricsCountProps) => {
  return (
    <>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="text">
        <strong>
          {count} metric{count !== 1 ? 's' : ''} found
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
    </>
  );
};
