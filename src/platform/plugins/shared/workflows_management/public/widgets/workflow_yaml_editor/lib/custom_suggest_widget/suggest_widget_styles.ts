/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiShadow, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const getSuggestWidgetStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  const container = css`
    display: flex;
    background: ${euiTheme.colors.backgroundBasePlain};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    ${euiShadow(euiThemeContext, 'm')}
    overflow: hidden;
    max-height: 340px;
  `;

  const hidden = css`
    display: none;
  `;

  const listPanel = css`
    width: 320px;
    display: flex;
    flex-direction: column;
    border-right: ${euiTheme.border.thin};
  `;

  const listHeader = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textSubdued};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: ${euiTheme.border.thin};
    flex-shrink: 0;
  `;

  const listScroll = css`
    overflow-y: auto;
    flex: 1;

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${euiTheme.colors.borderBaseSubdued};
      border-radius: 3px;
    }
  `;

  const listItem = css`
    padding: 6px ${euiTheme.size.m};
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    cursor: pointer;
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textParagraph};
    line-height: 1.4;

    &:hover {
      background: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const listItemSelected = css`
    background: ${euiTheme.colors.primary};
    color: ${euiTheme.colors.textInverse};

    &:hover {
      background: ${euiTheme.colors.primary};
    }
  `;

  const itemIcon = css`
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textSubdued};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.small};
    font-family: ${euiTheme.font.familyCode};
  `;

  const itemIconSelected = css`
    color: ${euiTheme.colors.textInverse};
    background: color-mix(in srgb, ${euiTheme.colors.textInverse} 15%, transparent);
  `;

  const itemLabel = css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${euiTheme.font.familyCode};
    font-size: 12px;
  `;

  const matchHighlight = css`
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.primaryText};
    text-decoration: underline;
    text-underline-offset: 2px;
  `;

  const matchHighlightSelected = css`
    color: ${euiTheme.colors.textInverse};
    text-decoration: underline;
    text-underline-offset: 2px;
  `;

  const itemKind = css`
    font-size: 10px;
    color: ${euiTheme.colors.textSubdued};
    flex-shrink: 0;
  `;

  const itemKindSelected = css`
    color: color-mix(in srgb, ${euiTheme.colors.textInverse} 70%, transparent);
  `;

  const detailsPanel = css`
    width: 380px;
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${euiTheme.colors.borderBaseSubdued};
      border-radius: 3px;
    }
  `;

  const detailContext = css`
    font-size: 11px;
    color: ${euiTheme.colors.textSubdued};
    margin-bottom: 2px;
  `;

  const detailName = css`
    font-size: 16px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textParagraph};
    font-family: ${euiTheme.font.familyCode};
  `;

  const detailSection = css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;

  const detailLabel = css`
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textSubdued};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;

  const typeBadges = css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `;

  const typeBadge = css`
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.medium};
    font-family: ${euiTheme.font.familyCode};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    color: ${euiTheme.colors.textSubdued};
  `;

  const requiredYes = css`
    color: ${euiTheme.colors.danger};
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: 13px;
  `;

  const requiredNo = css`
    color: ${euiTheme.colors.textParagraph};
    font-size: 13px;
  `;

  const description = css`
    font-size: 13px;
    color: ${euiTheme.colors.textSubdued};
    line-height: 1.5;
  `;

  const defaultValue = css`
    font-size: 12px;
    color: ${euiTheme.colors.textSubdued};
    font-family: ${euiTheme.font.familyCode};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: 4px 8px;
    border-radius: ${euiTheme.border.radius.small};
  `;

  const emptyDetails = css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${euiTheme.colors.textDisabled};
    font-size: 13px;
    font-style: italic;
  `;

  const keyList = css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.small};
    padding: 6px 8px;
  `;

  const keyRow = css`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
    font-family: ${euiTheme.font.familyCode};
    font-size: 12px;
    line-height: 1.4;
  `;

  const keyName = css`
    color: ${euiTheme.colors.textParagraph};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const keyType = css`
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
    flex-shrink: 0;
  `;

  const keyMore = css`
    font-size: 11px;
    color: ${euiTheme.colors.textSubdued};
    font-style: italic;
    margin-top: 2px;
  `;

  return {
    container,
    hidden,
    listPanel,
    listHeader,
    listScroll,
    listItem,
    listItemSelected,
    itemIcon,
    itemIconSelected,
    itemLabel,
    matchHighlight,
    matchHighlightSelected,
    itemKind,
    itemKindSelected,
    detailsPanel,
    detailContext,
    detailName,
    detailSection,
    detailLabel,
    typeBadges,
    typeBadge,
    requiredYes,
    requiredNo,
    description,
    defaultValue,
    emptyDetails,
    keyList,
    keyRow,
    keyName,
    keyType,
    keyMore,
  };
};
