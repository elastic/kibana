/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

export const FieldItemDragHandle: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      className="unifiedFieldListItemDragHandle"
      css={css`
        pointer-events: none;
        flex-shrink: 0;
        margin-right: ${euiTheme.size.s};
        width: ${euiTheme.size.base};
        height: 100%;
        overflow: hidden;
      `}
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem
        grow={false}
        css={css`
          flex-shrink: 0;
        `}
      >
        <EuiIcon type="grabOmnidirectional" size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
