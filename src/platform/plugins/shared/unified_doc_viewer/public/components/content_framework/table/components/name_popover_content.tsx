/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { TableFieldConfiguration } from '..';

interface NamePopoverContentProps {
  fieldName: string;
  fieldConfig: TableFieldConfiguration;
  cellActions: React.ReactNode;
}

export function NamePopoverContent({
  fieldName,
  fieldConfig,
  cellActions,
}: NamePopoverContentProps) {
  return (
    <>
      <EuiText size="s" className="eui-textTruncate">
        {fieldName}
      </EuiText>
      {fieldConfig?.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" className="eui-textTruncate">
            {fieldConfig.description}
          </EuiText>
        </>
      )}
      {cellActions}
    </>
  );
}
