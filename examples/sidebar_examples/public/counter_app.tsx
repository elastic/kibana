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
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';

export const counterAppId = 'sidebarExampleCounter';

export const getCounterParamsSchema = () =>
  z.object({
    counter: z.number().default(0),
  });

export type CounterSidebarParams = z.infer<ReturnType<typeof getCounterParamsSchema>>;

/**
 * Counter app that receives params and setParams as props.
 * Params are persisted to localStorage automatically.
 */
export function CounterApp({ params, setParams }: SidebarComponentProps<CounterSidebarParams>) {
  const { counter } = params;

  const increment = () => setParams({ counter: counter + 1 });
  const decrement = () => setParams({ counter: counter - 1 });
  const incrementBy = (amount: number) => setParams({ counter: counter + amount });
  const reset = () => setParams({ counter: 0 });

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiTitle size="s">
        <h2>Counter Example (Params-based)</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiText size="s" color="subdued">
        <p>Counter value is passed as params and persisted to localStorage.</p>
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
          <pre>{JSON.stringify(params, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
