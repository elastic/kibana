/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';

export interface SecondaryMenuSectionProps {
  children: ReactNode;
  label?: string;
}

/**
 * To reflect the design perfectly while maintaining a logical structure,
 * we need to use `6px` and `10px` which are not multiples of 4, hence why
 * `euiTheme` is not used for padding here.
 *
 * Furthermore, `236px` is not available in `euiTheme` as a constant,
 * so we use it directly.
 *
 * `EuiTitle` provides styles inconsistent with design, and `EuiText` doesn't allow
 * `h5` usage so semantically, the structure could use improvement.
 */
export const SecondaryMenuSectionComponent = ({
  children,
  label,
}: SecondaryMenuSectionProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const sectionId = label ? label.replace(/\s+/g, '-').toLowerCase() : undefined;

  return (
    <nav
      css={css`
        padding: ${euiTheme.size.m};

        &:not(:last-child) {
          border-bottom: 1px ${euiTheme.colors.borderBaseSubdued} solid;
        }
      `}
      aria-labelledby={sectionId || undefined}
    >
      {label && (
        <EuiText
          id={sectionId}
          css={css`
            font-size: ${euiTheme.size.m};
            color: ${euiTheme.colors.subduedText};
            // 6px comes from Figma, no token
            padding: 6px ${euiTheme.size.s};
          `}
          component="span"
        >
          {label}
        </EuiText>
      )}
      <ul
        css={css`
          --list-width: 236px;

          display: flex;
          flex-direction: column;
          width: var(--list-width);
          gap: ${euiTheme.size.xxs};
        `}
      >
        {children}
      </ul>
    </nav>
  );
};
