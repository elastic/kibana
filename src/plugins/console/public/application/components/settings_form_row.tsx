/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';


export interface DevToolsSettingsModalProps {
  label: string;
  labelWarning?: string;
  children: React.ReactNode;
}

export const SettingsFormRow = ({ label, labelWarning, children }: DevToolsSettingsModalProps) => {
  return (
    <EuiFormRow fullWidth>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              {label}
            </EuiFlexItem>
            {labelWarning && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="warning"
                  color="warning"
                  content={labelWarning}
                  position="right"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
