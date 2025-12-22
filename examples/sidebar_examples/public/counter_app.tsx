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
import { z } from '@kbn/zod/v4';
import { createSidebarAppHooks } from '@kbn/core-chrome-sidebar';

export const counterAppId = 'sidebarExampleCounter';

export const getCounterStateSchema = () =>
  z.object({
    counter: z.number().default(0),
  });

export type CounterSidebarState = z.infer<ReturnType<typeof getCounterStateSchema>>;

export const counterApp = createSidebarAppHooks<CounterSidebarState>(counterAppId)(
  ({ get, set }) => ({
    increment: () => set({ counter: get().counter + 1 }),
    decrement: () => set({ counter: get().counter - 1 }),
    incrementBy: (amount: number) => set({ counter: get().counter + amount }),
    reset: () => set({ counter: 0 }),
  })
);

const selectCounter = (s: CounterSidebarState) => s.counter;

export function CounterApp() {
  const counter = counterApp.useSelector(selectCounter);
  const { increment, decrement, incrementBy, reset } = counterApp.useActions();

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
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={reset}>
              Reset
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
