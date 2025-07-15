/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

export function LabelWithTooltip({
  labelContent,
  tooltipContent,
}: {
  labelContent: string;
  tooltipContent: string;
}) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{labelContent}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip type="question" content={tooltipContent} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
