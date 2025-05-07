/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';

export interface FieldWithoutActionsProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Section({ title, subtitle, children }: FieldWithoutActionsProps) {
  return (
    <>
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      {subtitle && (
        <>
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="xs">
            {subtitle}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />

      <>{children}</>
    </>
  );
}
