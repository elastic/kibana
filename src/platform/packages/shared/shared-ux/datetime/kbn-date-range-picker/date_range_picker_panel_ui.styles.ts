/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiFontSizeFromScale, euiLineHeightFromBaseline, euiScrollBarStyles } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';

const CONTAINER_HEIGHT = 500;

export const panelContainerStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    display: flex;
    flex-direction: column;
    min-block-size: ${CONTAINER_HEIGHT * 0.5}px;
    max-block-size: ${CONTAINER_HEIGHT}px;
    inline-size: ${euiTheme.components.forms.maxWidth}px;
    max-inline-size: 100%;
  `;

  return { root };
};

export const panelHeaderStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    display: flex;
    align-items: center;
    min-block-size: ${euiTheme.size.xxl};
  `;

  return { root };
};

export const subPanelHeadingStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    min-inline-size: 100%;
    min-block-size: ${euiTheme.size.xxl};
    padding-inline: ${euiTheme.size.base};
    color: ${euiTheme.colors.textHeading};
    font-size: ${euiFontSizeFromScale('s', euiTheme)};
    line-height: ${euiLineHeightFromBaseline('s', euiTheme)};
    font-weight: ${euiTheme.font.weight.semiBold};
  `;
  const button = css`
    appearance: none;
    cursor: pointer;
    outline-offset: -${euiTheme.focus.width};

    &:where(a, button):not(:disabled) {
      &:hover,
      &:focus {
        text-decoration: underline;
      }

      &:focus {
        background-color: ${euiTheme.focus.backgroundColor};
      }
    }
  `;

  return { root, button };
};

export const panelBodyStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const root = css`
    flex-grow: 1;
    overflow-block: auto;
    ${euiScrollBarStyles(euiThemeContext)}
    padding-inline: ${euiTheme.size.s};

    &:not(:first-child) {
      border-block-start: ${euiTheme.border.thin};
    }
  `;

  return { root };
};

export const panelBodySectionStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = null;

  return { root };
};

export const panelListItemStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    display: flex;
    align-items: center;
    min-block-size: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.medium};

    &:hover,
    &:focus-within {
      background-color: ${euiTheme.focus.backgroundColor};
    }
  `;
  const button = css`
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
    flex-grow: 1;
    padding: ${euiTheme.size.xs} ${euiTheme.size.xs};
    font-size: ${euiFontSizeFromScale('s', euiTheme)};
    line-height: ${euiLineHeightFromBaseline('s', euiTheme)};
    font-weight: ${euiTheme.font.weight.regular};
    color: ${euiTheme.colors.textParagraph};
    cursor: pointer;
    outline-offset: -${euiTheme.focus.width};
  `;
  const suffix = css`
    font-family: ${euiTheme.font.familyCode};
    font-size: ${euiFontSizeFromScale('xs', euiTheme)};
    line-height: 1;
    font-weight: ${euiTheme.font.weight.regular};
    color: ${euiTheme.colors.textSubdued};
  `;
  const extraActions = css`
    display: none;
    flex-shrink: 0;

    .css-${root.name}:hover > &,
    .css-${root.name}:focus-within > & {
      display: flex;
    }
  `;

  return { root, button, suffix, extraActions };
};

export const panelNavItemStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
    min-block-size: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.medium};

    &:hover,
    &:focus-within {
      background-color: ${euiTheme.focus.backgroundColor};
    }
  `;
  const button = css`
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
    flex-grow: 1;
    padding: ${euiTheme.size.xs};
    font-size: ${euiFontSizeFromScale('s', euiTheme)};
    line-height: ${euiLineHeightFromBaseline('s', euiTheme)};
    font-weight: ${euiTheme.font.weight.regular};
    color: ${euiTheme.colors.textParagraph};
    cursor: pointer;
    outline-offset: -${euiTheme.focus.width};
  `;
  const label = css`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: ${euiTheme.size.s};
  `;

  return { root, button, label };
};

export const panelFooterStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
    margin-block-start: auto;
    min-block-size: ${euiTheme.size.xxl};
    padding: ${euiTheme.size.base};

    &:not(:first-child) {
      border-block-start: ${euiTheme.border.thin};
    }
  `;
  const content = css`
    display: flex;
    flex-grow: 1;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const primaryAction = css`
    flex-shrink: 0;
    margin-inline-start: auto;
    justify-self: flex-end;
  `;

  return { root, content, primaryAction };
};

// Utils

export const panelSpacingStyles = ({ euiTheme }: UseEuiTheme) => {
  const block = css`
    padding-block: ${euiTheme.size.s};
  `;
  const inline = css`
    padding-inline: ${euiTheme.size.base};
  `;
  const both = css`
    ${block}
    ${inline}
  `;
  const none = null;

  return { block, inline, both, none };
};

export const panelDividerStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = css`
    margin-inline: ${euiTheme.size.s};
    border: none;
    border-block-start: ${euiTheme.border.thin};
  `;

  return { root };
};
