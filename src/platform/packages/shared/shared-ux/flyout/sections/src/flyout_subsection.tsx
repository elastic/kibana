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
import { EuiPanel, EuiSpacer, EuiTitle, useEuiMemoizedStyles } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { FlyoutSubsectionProps } from './types';

const getSubsectionStyles = ({ euiTheme }: UseEuiTheme) => ({
  subsection: css`
    & + & {
      margin-block-start: ${euiTheme.size.m};
    }
    /* Non-bordered preceding sibling: draw a rule above the following subsection. */
    &:not([data-bordered]) + & {
      padding-block-start: ${euiTheme.size.m};
      border-block-start: ${euiTheme.border.thin};
    }
  `,
});

export const FlyoutSubsection = ({
  id,
  title,
  hasBorder = false,
  children,
  ...subsectionProps
}: FlyoutSubsectionProps) => {
  const styles = useEuiMemoizedStyles(getSubsectionStyles);

  // No `aria-labelledby` counterpart to `FlyoutSection`: the `h5` already places the subsection in
  // the document outline, and a named region per subsection would only add landmark noise.
  if (hasBorder) {
    return (
      <div {...subsectionProps} id={id} css={styles.subsection} data-bordered>
        <EuiPanel hasShadow={false} hasBorder paddingSize="m">
          <EuiTitle size="xxs">
            <h5>{title}</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          {children}
        </EuiPanel>
      </div>
    );
  }

  return (
    // Cleared so a forwarded `data-bordered` cannot suppress the next subsection's divider.
    <div {...subsectionProps} id={id} css={styles.subsection} data-bordered={undefined}>
      <EuiTitle size="xxs">
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
    </div>
  );
};
