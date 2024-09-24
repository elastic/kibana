/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToken } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

const spacingXsCss = css`
  margin-bottom: ${euiThemeVars.euiSizeXS};
`;

export const FieldWithToken = ({
  field,
  iconType = 'tokenKeyword',
}: {
  field: string;
  iconType?: string;
}) => {
  return (
    <div css={spacingXsCss}>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        justifyContent="flexStart"
        gutterSize="xs"
      >
        <EuiFlexItem grow={false}>
          <EuiToken iconType={iconType} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{field}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
