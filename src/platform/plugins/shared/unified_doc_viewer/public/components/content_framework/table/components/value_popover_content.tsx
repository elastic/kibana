/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, useEuiFontSize } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import type { TableFieldConfiguration } from '..';

interface ValuePopoveContentProps {
  fieldConfig: TableFieldConfiguration;
  cellActions: React.ReactNode;
}

export function ValuePopoverContent({ fieldConfig, cellActions }: ValuePopoveContentProps) {
  const { fontSize } = useEuiFontSize('s');

  return (
    <>
      <EuiText
        css={
          fontSize
            ? css`
                * {
                  font-size: ${fontSize} !important;
                }
              `
            : undefined
        }
      >
        {fieldConfig.valueCellContent({ truncate: false })}
      </EuiText>
      {cellActions}
    </>
  );
}
