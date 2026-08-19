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
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

import type { MenuItem } from '../types';

interface FeaturedItemCardProps {
  item: MenuItem;
}

export const FeaturedItemCard = ({ item }: FeaturedItemCardProps) => (
  <EuiPanel
    element="button"
    hasBorder
    paddingSize="none"
    onClick={item.onClick}
    data-test-subj={item['data-test-subj']}
    css={styles.panel}
  >
    <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={item.icon} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem css={styles.textColumn}>
        <EuiText size="s" textAlign="left" css={styles.title}>
          <strong>{item.name}</strong>
        </EuiText>
        {item.description ? (
          <EuiText size="xs" color="subdued" textAlign="left" css={styles.description}>
            {item.description}
          </EuiText>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const styles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      height: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
      textAlign: 'left',
      cursor: 'pointer',
    }),
  textColumn: css({
    minWidth: 0,
  }),
  title: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textParagraph,
    }),
  description: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginTop: euiTheme.size.xs,
    }),
};
