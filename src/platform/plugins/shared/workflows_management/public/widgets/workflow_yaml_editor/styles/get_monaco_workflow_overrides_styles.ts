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

/**
 * Hook that injects Monaco-specific CSS that can't be handled through the theme system
 * This includes hover widget styling, connector decorations, and autocomplete icons
 */
export const getMonacoWorkflowOverridesStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    /* Enhanced Monaco hover styling for workflow editor */
    .monaco-editor .monaco-editor-hover:not([class*='contrib']):not([class*='glyph']),
    .monaco-hover:not([class*='contrib']):not([class*='glyph']) {
      width: 600px;
      min-width: 500px;
      max-width: 800px;
      max-height: 400px;
      font-size: 13px;
      z-index: 999;
      border-radius: 6px !important;
      ${euiShadow(euiThemeContext, 'm')}
      border-width: 0 !important;
      overflow: hidden !important;
    }

    .monaco-editor
      .monaco-editor-hover:not([class*='contrib']):not([class*='glyph'])
      .monaco-hover-content,
    .monaco-hover:not([class*='contrib']):not([class*='glyph']) .monaco-hover-content {
      width: 100%;
      min-width: 500px;
      max-width: 800px;
      padding: 12px 16px;
    }

    .monaco-editor
      .monaco-editor-hover:not([class*='contrib']):not([class*='glyph'])
      .hover-contents,
    .monaco-hover:not([class*='contrib']):not([class*='glyph']) .hover-contents {
      width: 100%;
      min-width: 500px;
      max-width: 800px;
    }

    /* Ensure Monaco's internal glyph hover widgets work properly */
    .monaco-editor [class*='modesGlyphHoverWidget'],
    .monaco-editor [class*='glyph'][class*='hover'] {
      display: block !important;
      visibility: visible !important;
    }

    .monaco-editor .monaco-editor-hover .markdown-docs {
      width: 100%;
      min-width: 500px;
      max-width: 800px;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .monaco-editor .monaco-editor-hover h2 {
      font-size: 16px !important;
      font-weight: 600;
      margin-bottom: 8px !important;
      color: ${euiTheme.colors.primaryText};
    }

    .monaco-editor .monaco-editor-hover h3 {
      font-size: 14px !important;
      font-weight: 600;
      margin-top: 16px !important;
      margin-bottom: 8px !important;
      color: ${euiTheme.colors.primaryText};
    }

    .monaco-editor .monaco-editor-hover a {
      color: ${euiTheme.colors.primary};
      text-decoration: none;
    }

    .monaco-editor .monaco-editor-hover a:hover {
      text-decoration: underline;
    }

    .monaco-editor .monaco-editor-hover code {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
    }

    .monaco-editor .monaco-editor-hover pre {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      overflow: auto;
      max-height: 120px;
    }

    .monaco-editor .suggest-widget {
      border-radius: 6px !important;
      ${euiShadow(euiThemeContext, 'm')}
      border-width: 0 !important;
      overflow: hidden !important; // so border-radius is applied correctly
    }

    .monaco-editor .suggest-details > .monaco-scrollable-element > .body > .header > .codicon-close,
    .monaco-editor
      .suggest-widget
      .monaco-list
      .monaco-list-row
      > .contents
      > .main
      > .right
      > .readMore::before {
      margin-right: -4px;
      line-height: 25px; // 21px + 4px for padding
    }

    .monaco-scrollable-element > .scrollbar > .slider {
      width: calc(${euiTheme.size.s} * 0.75) !important;
      border-radius: ${euiTheme.border.radius.medium} !important;
      margin-right: 2px;
    }

    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon {
      color: ${euiTheme.colors.textParagraph} !important;
    }
  `;
};
