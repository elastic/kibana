/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';

/** A small colored square followed by a subdued label. */
export const LegendSwatch = ({
  colorCss,
  label,
}: {
  colorCss: ReturnType<typeof css>;
  label: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <span
          aria-hidden="true"
          css={[
            colorCss,
            css`
              display: inline-block;
              width: ${euiTheme.size.s};
              height: ${euiTheme.size.s};
              border-radius: ${euiTheme.border.radius.small};
            `,
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <span>{label}</span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
