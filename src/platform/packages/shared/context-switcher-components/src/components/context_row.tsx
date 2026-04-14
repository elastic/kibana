/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiListGroupItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { CONTEXT_ROW_HEIGHT, type ContextRowModel } from './types';

export interface ContextRowProps {
  readonly row: ContextRowModel;
  readonly onClick: () => void;
}

/**
 * The row component for the context switcher that contains the avatar, the title, the subtitle and the chevron.
 */

export const ContextRow = ({ row, onClick }: ContextRowProps) => {
  const rowStyles = css`
    && .euiListGroupItem__label {
      flex: 1 1 auto;
      min-width: 0;
    }
    && .euiListGroupItem__button {
      min-height: ${CONTEXT_ROW_HEIGHT}px;
    }
    /* no underline */
    && .euiListGroupItem__button:hover,
    && .euiListGroupItem__button:focus {
      text-decoration: none;
    }
  `;

  const truncateCss = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const rowLabel = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow>
        <EuiText size="s" css={truncateCss}>
          {row.label}
        </EuiText>
        {row.value != null && (
          <EuiText size="xs" color="subdued" css={truncateCss}>
            {row.value}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="arrowRight" size="m" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiListGroupItem
      css={rowStyles}
      label={rowLabel}
      icon={row.prepend}
      onClick={onClick}
      isDisabled={row.disabled}
      aria-label={row.ariaLabel}
      data-test-subj={row['data-test-subj']}
      size="s"
      color="text"
    />
  );
};
