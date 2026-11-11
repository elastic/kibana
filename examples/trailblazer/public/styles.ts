/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/css';
import type { Theme } from '@kbn/ui-theme';

/** Publishes the EUI tokens used by the styles below as CSS custom properties on `root`. */
export function applyThemeVars(root: HTMLElement, theme: Theme) {
  const vars: Readonly<Record<string, string>> = {
    '--tb-bg': theme.euiColorBackgroundBaseSubdued,
    '--tb-pane-bg': theme.euiColorBackgroundBasePlain,
    '--tb-border': theme.euiColorBorderBasePlain,
    '--tb-border-light': theme.euiBorderColor,
    '--tb-text': theme.euiColorTextParagraph,
    '--tb-subdued': theme.euiColorTextSubdued,
    '--tb-primary': theme.euiColorPrimary,
    '--tb-primary-text': theme.euiColorPrimaryText,
    '--tb-selected-bg': theme.euiColorBackgroundLightPrimary,
    '--tb-hover-bg': theme.euiColorBackgroundBaseInteractiveSelect,
    '--tb-danger': theme.euiColorDangerText,
    '--tb-success': theme.euiColorSuccessText,
    '--tb-accent': theme.euiColorAccentText,
    '--tb-warning': theme.euiColorWarningText,
    '--tb-shadow': theme.euiShadowColor,
    '--tb-on-primary': theme.euiColorEmptyShade,
    '--tb-font': theme.euiFontFamily,
    '--tb-code-font': theme.euiCodeFontFamily,
    '--tb-radius': theme.euiBorderRadius,
    '--tb-size-xs': theme.euiSizeXS,
    '--tb-size-s': theme.euiSizeS,
    '--tb-size-m': theme.euiSizeM,
    '--tb-size-l': theme.euiSizeL,
    '--tb-font-xs': theme.euiFontSizeXS,
    '--tb-font-s': theme.euiFontSizeS,
    '--tb-weight-semibold': String(theme.euiFontWeightSemiBold),
  };
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}

const ellipsis = `
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const control = `
  font: inherit;
  font-size: var(--tb-font-s);
  color: var(--tb-text);
  background: var(--tb-pane-bg);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius);
  padding: var(--tb-size-xs) var(--tb-size-s);
  &:focus {
    outline: 2px solid var(--tb-primary);
    outline-offset: -1px;
  }
`;

export const styles = {
  root: css`
    display: flex;
    flex-direction: column;
    height: var(--kbn-application--content-height, 100vh);
    min-height: 0;
    background: var(--tb-bg);
    color: var(--tb-text);
    font-family: var(--tb-font);
    font-size: var(--tb-font-s);
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-m);
    padding: var(--tb-size-s) var(--tb-size-l);
    background: var(--tb-pane-bg);
    border-bottom: 1px solid var(--tb-border-light);
  `,
  brand: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-s);
    font-weight: var(--tb-weight-semibold);
    white-space: nowrap;
  `,
  brandMark: css`
    display: inline-flex;
    gap: 2px;
    & > span {
      width: 4px;
      height: 14px;
      border-radius: 1px;
      background: var(--tb-primary);
    }
    & > span:nth-of-type(2) {
      opacity: 0.6;
    }
    & > span:nth-of-type(3) {
      opacity: 0.3;
    }
  `,
  crumbs: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-xs);
    min-width: 0;
    overflow-x: auto;
    color: var(--tb-subdued);
  `,
  crumb: css`
    border: none;
    background: none;
    font: inherit;
    color: var(--tb-primary-text);
    cursor: pointer;
    padding: 2px var(--tb-size-xs);
    border-radius: var(--tb-radius);
    max-width: 220px;
    ${ellipsis}
    &:hover {
      background: var(--tb-hover-bg);
    }
  `,
  crumbCurrent: css`
    color: var(--tb-text);
    font-weight: var(--tb-weight-semibold);
  `,
  trail: css`
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: var(--tb-size-m);
    min-height: 0;
    padding: var(--tb-size-m) var(--tb-size-l);
    overflow-x: auto;
    overflow-y: hidden;
  `,
  pane: css`
    flex: 0 0 auto;
    width: 340px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--tb-pane-bg);
    border: 1px solid var(--tb-border-light);
    border-radius: 8px;
    box-shadow: 0 1px 3px color-mix(in srgb, var(--tb-shadow) 12%, transparent);
    animation: tbPaneIn 160ms ease-out;
    transition: border-color 120ms ease, box-shadow 120ms ease;
    @keyframes tbPaneIn {
      from {
        opacity: 0;
        transform: translateX(12px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    &:focus-within {
      border-color: var(--tb-primary);
      box-shadow: 0 0 0 1px var(--tb-primary),
        0 4px 12px color-mix(in srgb, var(--tb-shadow) 16%, transparent);
    }
  `,
  paneWide: css`
    width: 460px;
  `,
  paneHeader: css`
    display: flex;
    align-items: flex-start;
    gap: var(--tb-size-s);
    padding: var(--tb-size-s) var(--tb-size-m);
    border-bottom: 1px solid var(--tb-border-light);
  `,
  paneKind: css`
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tb-subdued);
  `,
  paneHeading: css`
    flex: 1;
    min-width: 0;
  `,
  paneTitle: css`
    font-weight: var(--tb-weight-semibold);
    ${ellipsis}
  `,
  paneSubtitle: css`
    font-size: var(--tb-font-xs);
    color: var(--tb-subdued);
    font-family: var(--tb-code-font);
    ${ellipsis}
  `,
  paneBody: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  `,
  iconButton: css`
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--tb-radius);
    background: none;
    color: var(--tb-subdued);
    cursor: pointer;
    font-size: 14px;
    line-height: 24px;
    &:hover {
      background: var(--tb-hover-bg);
      color: var(--tb-text);
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: var(--tb-size-s);
    padding: var(--tb-size-s) var(--tb-size-m);
    border-bottom: 1px solid var(--tb-border-light);
  `,
  inline: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-s);
  `,
  spacer: css`
    flex: 1;
  `,
  input: css`
    ${control}
    flex: 1;
    min-width: 0;
  `,
  select: css`
    ${control}
    flex: 0 0 auto;
  `,
  textarea: css`
    ${control}
    font-family: var(--tb-code-font);
    font-size: var(--tb-font-xs);
    resize: vertical;
    min-height: 32px;
  `,
  checkbox: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-xs);
    font-size: var(--tb-font-xs);
    color: var(--tb-subdued);
    white-space: nowrap;
  `,
  primaryButton: css`
    font: inherit;
    font-size: var(--tb-font-s);
    font-weight: var(--tb-weight-semibold);
    color: var(--tb-on-primary);
    background: var(--tb-primary);
    border: none;
    border-radius: var(--tb-radius);
    padding: var(--tb-size-xs) var(--tb-size-m);
    cursor: pointer;
    &:hover {
      filter: brightness(1.08);
    }
  `,
  linkButton: css`
    font: inherit;
    font-size: var(--tb-font-xs);
    color: var(--tb-primary-text);
    background: none;
    border: none;
    padding: var(--tb-size-s);
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  `,
  discoverLink: css`
    font-size: var(--tb-font-xs);
    color: var(--tb-primary-text);
    text-decoration: none;
    white-space: nowrap;
    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
  tabs: css`
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--tb-bg);
    border-radius: var(--tb-radius);
  `,
  tab: css`
    flex: 1;
    font: inherit;
    font-size: var(--tb-font-xs);
    color: var(--tb-subdued);
    background: none;
    border: none;
    border-radius: var(--tb-radius);
    padding: var(--tb-size-xs) var(--tb-size-s);
    cursor: pointer;
  `,
  tabActive: css`
    color: var(--tb-text);
    background: var(--tb-pane-bg);
    font-weight: var(--tb-weight-semibold);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--tb-shadow) 15%, transparent);
  `,
  status: css`
    font-size: var(--tb-font-xs);
    color: var(--tb-subdued);
  `,
  error: css`
    font-size: var(--tb-font-xs);
    color: var(--tb-danger);
    white-space: pre-wrap;
    word-break: break-word;
  `,
  list: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    outline: none;
    padding: var(--tb-size-xs) 0;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-s);
    padding: 6px var(--tb-size-m);
    border-left: 3px solid transparent;
    cursor: pointer;
    &:hover {
      background: var(--tb-hover-bg);
    }
  `,
  rowSelected: css`
    background: var(--tb-selected-bg);
    border-left-color: var(--tb-primary);
    &:hover {
      background: var(--tb-selected-bg);
    }
  `,
  staticRow: css`
    display: flex;
    align-items: center;
    gap: var(--tb-size-s);
    padding: 6px var(--tb-size-m);
    border-left: 3px solid transparent;
  `,
  groupHeading: css`
    padding: var(--tb-size-s) var(--tb-size-m) 2px;
    font-size: 10px;
    font-weight: var(--tb-weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tb-subdued);
  `,
  rowMissing: css`
    opacity: 0.55;
    font-style: italic;
  `,
  rowMain: css`
    flex: 1;
    min-width: 0;
  `,
  rowTitle: css`
    ${ellipsis}
  `,
  rowMeta: css`
    font-size: var(--tb-font-xs);
    color: var(--tb-subdued);
    ${ellipsis}
  `,
  rowValue: css`
    font-family: var(--tb-code-font);
    font-size: var(--tb-font-xs);
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  count: css`
    flex: 0 0 auto;
    font-size: var(--tb-font-xs);
    color: var(--tb-subdued);
    font-variant-numeric: tabular-nums;
  `,
  chevron: css`
    flex: 0 0 auto;
    color: var(--tb-subdued);
  `,
  badge: css`
    flex: 0 0 auto;
    display: inline-block;
    min-width: 22px;
    text-align: center;
    font-size: 10px;
    font-weight: var(--tb-weight-semibold);
    font-family: var(--tb-code-font);
    line-height: 16px;
    padding: 0 4px;
    border-radius: var(--tb-radius);
    color: var(--tb-badge-color, var(--tb-subdued));
    background: color-mix(in srgb, var(--tb-badge-color, var(--tb-subdued)) 12%, transparent);
  `,
  meter: css`
    height: 4px;
    margin-top: 3px;
    border-radius: 2px;
    background: var(--tb-border-light);
    overflow: hidden;
    & > div {
      height: 100%;
      background: var(--tb-primary);
    }
  `,
  chart: css`
    display: flex;
    align-items: flex-end;
    gap: 1px;
    height: 72px;
  `,
  bar: css`
    flex: 1;
    min-width: 2px;
    min-height: 1px;
    background: var(--tb-primary);
    opacity: 0.7;
    border-radius: 2px 2px 0 0;
    cursor: pointer;
    &:hover {
      opacity: 1;
    }
  `,
  barEmpty: css`
    background: var(--tb-border-light);
    opacity: 1;
  `,
  axis: css`
    display: flex;
    justify-content: space-between;
    gap: var(--tb-size-s);
    font-size: 10px;
    color: var(--tb-subdued);
  `,
  empty: css`
    padding: var(--tb-size-l) var(--tb-size-m);
    text-align: center;
    color: var(--tb-subdued);
    font-size: var(--tb-font-xs);
  `,
  json: css`
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: var(--tb-size-m);
    overflow: auto;
    font-family: var(--tb-code-font);
    font-size: var(--tb-font-xs);
    white-space: pre-wrap;
    word-break: break-word;
  `,
};

const TYPE_COLORS: Readonly<Record<string, string>> = {
  date: 'var(--tb-accent)',
  date_nanos: 'var(--tb-accent)',
  keyword: 'var(--tb-primary-text)',
  constant_keyword: 'var(--tb-primary-text)',
  wildcard: 'var(--tb-primary-text)',
  text: 'var(--tb-primary-text)',
  match_only_text: 'var(--tb-primary-text)',
  boolean: 'var(--tb-warning)',
  ip: 'var(--tb-danger)',
};

const TYPE_LABELS: Readonly<Record<string, string>> = {
  date: 'dt',
  date_nanos: 'dt',
  keyword: 'k',
  constant_keyword: 'k',
  wildcard: 'k',
  text: 't',
  match_only_text: 't',
  boolean: 'b',
  ip: 'ip',
  geo_point: 'geo',
  geo_shape: 'geo',
  flattened: '{}',
};

const NUMBER_TYPE_LABEL = '#';

export function typeBadgeColor(type: string, isNumeric: boolean): string {
  return isNumeric ? 'var(--tb-success)' : TYPE_COLORS[type] ?? 'var(--tb-subdued)';
}

export function typeBadgeLabel(type: string, isNumeric: boolean): string {
  return isNumeric ? NUMBER_TYPE_LABEL : TYPE_LABELS[type] ?? type.slice(0, 3);
}
