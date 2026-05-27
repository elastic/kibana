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
import type { ContextRowModel } from './types';

export interface ContextRowProps {
  readonly row: ContextRowModel;
  readonly onClick: () => void;
}

/**
 * The row component for the context switcher that contains the avatar, the title, the subtitle and the chevron.
 */

export const ContextRow = ({ row, onClick }: ContextRowProps) => {
  const truncateStyles = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const rowLabel = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem
        grow
        css={css`
          min-width: 0;
        `}
      >
        <EuiText size="s" css={truncateStyles}>
          {row.label}
        </EuiText>
        {row.value != null && (
          <EuiText size="xs" color="subdued">
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
      label={rowLabel}
      icon={row.prepend}
      onClick={onClick}
      isDisabled={row.disabled}
      aria-label={row.ariaLabel}
      data-test-subj={row['data-test-subj']}
      color="text"
    />
  );
};
