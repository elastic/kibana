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
  /**
   * Optional action rendered right-aligned on the section header row (e.g. a
   * settings cog). Only shown when the section has a header (a `label`).
   */
  action?: ReactNode;
}

export const SecondaryMenuSectionComponent = ({
  children,
  label,
  action,
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

  const headerRowStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.xs};
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: ${euiTheme.size.xxs};
  `;

  return (
    <div css={secondaryMenuWrapperStyles} role="group" aria-labelledby={sectionId || undefined}>
      {(label || action) && (
        <div css={headerRowStyles}>
          {label && (
            <EuiText id={sectionId} css={labelStyles} component="span">
              {label}
            </EuiText>
          )}
          {action}
        </div>
      )}
      <ul css={listStyles} role="none">
        {children}
      </ul>
    </div>
  );
};
