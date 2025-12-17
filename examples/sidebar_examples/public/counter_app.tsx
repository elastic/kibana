/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiFormRow,
} from '@elastic/eui';
import { useSidebarAppState, useSidebar } from '@kbn/core-chrome-sidebar';

export const counterAppId = 'sidebarExampleCounter';

interface CounterState {
  counter: number;
}

export const useCounterSideBarApp = () => {
  const { open } = useSidebar();
  const { updateState } = useCounterAppState();
  return {
    open: () => open(counterAppId),
    reset: () => updateState({ counter: 0 }),
  };
};

const useCounterAppState = () => {
  return useSidebarAppState<CounterState>(counterAppId);
};

export function CounterApp() {
  const { state, updateState } = useCounterAppState();

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiTitle size="s">
        <h2>Counter Example</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiText size="s" color="subdued">
        <p>Simple counter with state persistence.</p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFormRow label="Counter">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={() => updateState({ counter: (state?.counter || 0) - 1 })}>
              -
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{state?.counter || 0}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={() => updateState({ counter: (state?.counter || 0) + 1 })}>
              +
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
