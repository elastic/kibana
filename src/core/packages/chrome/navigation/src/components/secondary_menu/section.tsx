/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface SecondaryMenuSectionProps {
  children: ReactNode;
  label?: string;
}

export const SecondaryMenuSectionComponent = ({
  children,
  label,
}: SecondaryMenuSectionProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const sectionId = label ? label.replace(/\s+/g, '-').toLowerCase() : undefined;

  const wrapperStyles = css`
    padding: ${euiTheme.size.m};

    &:not(:last-child) {
      border-bottom: 1px ${euiTheme.colors.borderBaseSubdued} solid;
    }
  `;

  /**
   * To reflect the design perfectly while maintaining a logical structure,
   * we need to use `6px` which isn't a multiple of 4 and there's no token for it,
   * hence why we're not using `euiTheme` here.
   */
  const labelStyles = css`
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.subduedText};
    padding: 6px ${euiTheme.size.s};
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: ${euiTheme.size.xxs};
  `;

  return (
    <nav css={wrapperStyles} aria-labelledby={sectionId || undefined}>
      {label && (
        <EuiText id={sectionId} css={labelStyles} component="span">
          {label}
        </EuiText>
      )}
      <ul css={listStyles}>{children}</ul>
    </nav>
  );
};
