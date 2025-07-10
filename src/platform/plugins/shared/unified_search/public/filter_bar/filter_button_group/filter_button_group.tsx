/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, ReactNode } from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '../../use_memo_css';

interface Props {
  items: ReactNode[];
  /**
   * Displays the last item without a border radius as if attached to the next DOM node
   */
  attached?: boolean;
  /**
   * Matches overall height with standard form/button sizes
   */
  size?: 'm' | 's';
}

export const FilterButtonGroup: FC<Props> = ({ items, attached, size = 'm', ...rest }: Props) => {
  const styles = useMemoCss(filterButtonStyles);
  return (
    <EuiFlexGroup
      className={classNames('kbnFilterButtonGroup', {
        'kbnFilterButtonGroup--attached': attached,
        [`kbnFilterButtonGroup--${size}`]: size,
      })}
      gutterSize="none"
      responsive={false}
      css={styles.wrapper}
      {...rest}
    >
      {items.map((item, i) =>
        item == null ? undefined : (
          <EuiFlexItem key={i} grow={false}>
            {item}
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
};

const filterButtonStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      height: euiTheme.size.xxl,
      backgroundColor: euiTheme.colors.backgroundBaseFormsPrepend,
      borderRadius: euiTheme.border.radius.medium,
      '&::after': {
        content: "''",
        position: 'absolute',
        inset: 0,
        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        borderRadius: 'inherit',
        pointerEvents: 'none',
      },
      // Targets any interactable elements
      '*:enabled': {
        transform: 'none !important',
      },
      '&.kbnFilterButtonGroup--s': {
        height: euiTheme.size.xl,
      },
      ' &.kbnFilterButtonGroup--attached': {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      },
      '> *:not(:last-of-type)': {
        borderRight: `1px solid ${euiTheme.colors.borderBasePlain}`,
      },
    }),
};
