/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export const Step = ({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: ReactNode }>) => (
  <>
    <EuiTitle size="m">
      <h2>{title}</h2>
    </EuiTitle>
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    {children}
    <EuiSpacer size="xxl" />
  </>
);

export const SubSection = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    {children}
    <EuiSpacer size="l" />
  </>
);

export const Demo = ({
  title,
  kind,
  now,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  kind?: 'CSS' | 'JS';
  now: string;
  description: ReactNode;
}>) => (
  <EuiFlexItem>
    <EuiPanel hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {kind && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={kind === 'CSS' ? 'accent' : 'primary'}>{kind}</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">now: {now}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  </EuiFlexItem>
);

export const Box = ({ children }: PropsWithChildren) => (
  <EuiPanel color="subdued" paddingSize="m">
    <EuiText size="s" textAlign="center">
      {children}
    </EuiText>
  </EuiPanel>
);
