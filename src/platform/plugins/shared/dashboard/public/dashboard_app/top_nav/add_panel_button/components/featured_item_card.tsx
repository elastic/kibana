/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

import type { MenuItem } from '../types';

interface FeaturedItemCardProps {
  item: MenuItem;
  /** Optional title override; defaults to the item name. */
  title?: string;
  /** Optional description override; defaults to the item description. */
  description?: string;
  className?: string;
}

export const FeaturedItemCard = ({
  item,
  title,
  description,
  className,
}: FeaturedItemCardProps) => (
  <EuiPanel
    element="button"
    hasBorder
    paddingSize="none"
    onClick={item.onClick}
    className={className}
    data-test-subj={item['data-test-subj']}
    css={styles.panel}
  >
    <div css={styles.titleRow}>
      <EuiIcon type={item.icon} size="m" aria-hidden={true} />
      <EuiText size="s" textAlign="left">
        <strong className="featuredPanelItem__title">{title ?? item.name}</strong>
      </EuiText>
    </div>
    <EuiText size="xs" color="subdued" textAlign="left" css={styles.description}>
      {description ?? item.description}
    </EuiText>
  </EuiPanel>
);

const styles = {
  panel: css({
    textAlign: 'left',
  }),
  titleRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.s,
    }),
  description: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginTop: euiTheme.size.xs,
    }),
};
