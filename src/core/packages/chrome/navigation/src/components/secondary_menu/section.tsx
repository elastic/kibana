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
  const euiThemeContext = useEuiTheme();
  const { euiTheme, highContrastMode } = euiThemeContext;

  const sectionId = label ? label.replace(/\s+/g, '-').toLowerCase() : undefined;

  const secondaryMenuWrapperStyles = css`
    padding: ${euiTheme.size.m};
    position: relative;

    &:not(:last-child) {
      ${highContrastMode
        ? `
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
        margin-left: ${euiTheme.size.m};
        margin-right: ${euiTheme.size.m};
        padding-left: 0;
        padding-right: 0;
      `
        : `
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: ${euiTheme.size.m};
          right: ${euiTheme.size.m};
          height: ${euiTheme.border.width.thin};
          background-color: ${euiTheme.colors.borderBaseSubdued};
        }
      `}
    }
  `;

  const labelStyles = css`
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    display: block;
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: ${euiTheme.size.xxs};
  `;

  return (
    <div css={secondaryMenuWrapperStyles} role="group" aria-labelledby={sectionId || undefined}>
      {label && (
        <EuiText id={sectionId} css={labelStyles} component="span">
          {label}
        </EuiText>
      )}
      <ul css={listStyles} role="none">
        {children}
      </ul>
    </div>
  );
};
