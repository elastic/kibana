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
}: FeaturedItemCardProps) => {
  const resolvedDescription = description ?? item.description;

  return (
    <EuiPanel
      element="button"
      hasBorder
      paddingSize="none"
      onClick={item.onClick}
      className={className}
      data-test-subj={item['data-test-subj']}
      css={styles.panel}
    >
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="s"
        responsive={false}
        justifyContent="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={item.icon} size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={true} css={styles.textColumn}>
          <EuiText size="s" textAlign="left">
            <strong className="featuredPanelItem__title">{title ?? item.name}</strong>
          </EuiText>
          {resolvedDescription ? (
            <EuiText size="xs" color="subdued" textAlign="left" css={styles.description}>
              {resolvedDescription}
            </EuiText>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const styles = {
  panel: css({
    width: '100%',
    textAlign: 'left',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  }),
  textColumn: css({
    minWidth: 0,
    textAlign: 'left',
  }),
  description: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginTop: euiTheme.size.xs,
    }),
};
