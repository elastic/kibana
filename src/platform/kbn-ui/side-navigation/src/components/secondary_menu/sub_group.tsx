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

export interface SecondaryMenuSubGroupProps {
  children: ReactNode;
  label: string;
  id?: string;
}

/**
 * One extra level of hierarchy below a {@link SecondaryMenuSectionComponent}:
 * a named group of items, indented under its label. Renders as an `<li>` so it
 * slots into the section's item `<ul>`, with its own nested `<ul>` for items.
 */
export const SecondaryMenuSubGroupComponent = ({
  children,
  label,
  id,
}: SecondaryMenuSubGroupProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const labelId = id ? `${id}-label` : undefined;

  const wrapperStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xxs};
    padding-top: ${euiTheme.size.xs};
  `;

  const labelStyles = css`
    color: ${euiTheme.colors.textSubdued};
    font-weight: ${euiTheme.font.weight.semiBold};
    padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
    display: block;
  `;

  // The group's items are indented slightly relative to the section's flat items
  // so the grouping reads visually without a heavy container.
  const listStyles = css`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: ${euiTheme.size.xxs};
    padding-left: ${euiTheme.size.s};
    border-left: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    margin-left: ${euiTheme.size.s};
  `;

  return (
    <li role="none" css={wrapperStyles}>
      <EuiText id={labelId} css={labelStyles} component="span" size="xs">
        {label}
      </EuiText>
      <ul css={listStyles} role="group" aria-labelledby={labelId}>
        {children}
      </ul>
    </li>
  );
};
