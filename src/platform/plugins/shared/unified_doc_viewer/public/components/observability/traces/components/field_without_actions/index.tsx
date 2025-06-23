/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';

export interface FieldWithoutActionsProps {
  label: string;
  children: React.ReactNode;
}

export function FieldWithoutActions({ label, children, ...props }: FieldWithoutActionsProps) {
  if (!label) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1}>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h3>{label}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
