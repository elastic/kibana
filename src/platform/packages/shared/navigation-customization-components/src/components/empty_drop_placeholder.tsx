/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { type CSSProperties } from 'react';

interface EmptyDroppableStyleOptions {
  isDragging: boolean;
}

interface Props {
  message: string;
}

/**
 * Styles EuiDroppable as the empty drop surface (dashed box). Omit the rest-state
 * fill while dragging so EUI's isDragging / isDraggingOver background can show.
 */
export const getEmptyDroppableStyle = (
  euiTheme: EuiThemeComputed,
  { isDragging }: EmptyDroppableStyleOptions
): CSSProperties => ({
  position: 'relative',
  minBlockSize: euiTheme.size.xxxl,
  border: `${euiTheme.border.width.thin} dashed ${euiTheme.border.color}`,
  borderRadius: euiTheme.border.radius.medium,
  ...(isDragging ? {} : { backgroundColor: euiTheme.colors.backgroundBaseSubdued }),
});

/**
 * Empty-list copy overlaid on EuiDroppable. Out of flow so the dnd placeholder
 * opens inside the droppable instead of below the text.
 */
export const EmptyDropPlaceholder = ({ message }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      gutterSize="none"
      responsive={false}
      data-test-subj="customizeNavigationEmptyDropPlaceholder"
      css={css`
        position: absolute;
        inset: 0;
        pointer-events: none;
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" textAlign="center">
          {message}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
