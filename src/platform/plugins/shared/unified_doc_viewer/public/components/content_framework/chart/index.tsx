/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';

export interface ContentFrameworkChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  'data-test-subj': string;
}

export function ContentFrameworkChart({
  'data-test-subj': contentFrameworkChartDataTestSubj,
  title,
  description,
  children,
}: ContentFrameworkChartProps) {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj={contentFrameworkChartDataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {description && (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={description}
                data-test-subj="ContentFrameworkChartDescription"
                size="s"
                color="subdued"
                aria-label={description}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
