/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

interface Props {
  id: string;
  title: string;
  /** Whether the accordion is open on first render. Defaults to true. */
  initialIsOpen?: boolean;
  bordered?: boolean;
  children: React.ReactNode;
}

export function GenAiSection({
  id,
  title,
  initialIsOpen = true,
  bordered = true,
  children,
}: Props) {
  return (
    <EuiAccordion
      id={`genAiSection-${id}`}
      data-test-subj={`genAiSection-${id}`}
      initialIsOpen={initialIsOpen}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      }
    >
      <EuiSpacer size="s" />
      {bordered ? (
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          {children}
        </EuiPanel>
      ) : (
        children
      )}
    </EuiAccordion>
  );
}
