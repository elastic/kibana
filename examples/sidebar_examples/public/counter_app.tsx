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
import { useSidebarApp } from '@kbn/core-chrome-sidebar';

export const counterAppId = 'sidebarExampleCounter';

export interface CounterSidebarState {
  counter: number;
}

export const useCounterSideBarApp = () => {
  const { open, setState, state } = useSidebarApp<CounterSidebarState>(counterAppId);
  return {
    // business state
    counter: state.counter,
    // Awesome business logic goes here
    increment: () => {
      setState({ counter: state.counter + 1 });
    },
    decrement: () => {
      setState({ counter: state.counter - 1 });
    },
    incrementBy: (amount: number) => {
      setState({ counter: state.counter + amount });
    },
    open: () => {
      open();
    },
    reset: () => {
      setState({ counter: 0 });
    },
  };
};

export function CounterApp() {
  const { counter, increment, decrement, incrementBy } = useCounterSideBarApp();

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiTitle size="s">
        <h2>Counter Example (Custom Actions)</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiText size="s" color="subdued">
        <p>Counter with custom increment/decrement actions.</p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFormRow label="Counter">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={decrement}>
              -
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{counter}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={increment}>
              +
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={() => incrementBy(5)}>
              +5
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify({ counter }, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
