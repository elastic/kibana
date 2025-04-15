/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { UseEuiTheme, transparentize } from '@elastic/eui';

// Default styles for Markdown element
//
// 1. Links
// 2. Headings
// 3. Images
// 4. Blockquotes
// 5. Horizontal rules
// 6. Lists
// 7. Tables
// 8. Code blocks

export const markdownStyles = (euiTheme: UseEuiTheme['euiTheme'], isReversed: boolean) => {
  // Note: The inlined base font size is set in common/functions/font.js. It should match $kbnMdFontSize.
  const kbnDefaultFontSize = 14;

  // Function to convert px to em
  const canvasToEm = (size: number): string => `${size / kbnDefaultFontSize}em`;

  // Font size variables
  const kbnMarkdownFontSizeS = canvasToEm(12);
  const kbnMarkdownFontSize = canvasToEm(14);
  const kbnMarkdownFontSizeL = canvasToEm(20);
  const kbnMarkdownFontSizeXL = canvasToEm(28);
  const kbnMarkdownFontSizeXXL = canvasToEm(36);

  // Spacing variables
  const kbnMarkdownSizeL = canvasToEm(24);
  const kbnMarkdownSize = canvasToEm(16);
  const kbnMarkdownSizeS = canvasToEm(12);
  const kbnMarkdownSizeXS = canvasToEm(8);
  const kbnMarkdownSizeXXS = canvasToEm(4);

  // Grayscale variables
  const kbnMarkdownAlphaLightestShade = transparentize(`${euiTheme.colors.fullShade}`, 0.05);
  const kbnMarkdownAlphaLightShade = transparentize(`${euiTheme.colors.fullShade}`, 0.15);

  // Reverse grayscale for opposite of theme
  const kbnMarkdownAlphaLightestShadeReversed = transparentize(
    `${euiTheme.colors.emptyShade}`,
    0.05
  );
  const kbnMarkdownAlphaLightShadeReversed = transparentize(`${euiTheme.colors.emptyShade}`, 0.15);

  return css({
    ...(isReversed && {
      color: `${euiTheme.colors.lightestShade}`,
    }),

    '> *:first-child': {
      marginTop: '0 !important',
    },

    '> *:last-child': {
      marginBottom: '0 !important',
    },

    'p, blockquote, ul, ol, dl, table, pre': {
      marginTop: 0,
      marginBottom: kbnMarkdownSize,
      lineHeight: '1.5em',
    },

    strong: {
      fontWeight: 600,
    },

    // Links
    a: {
      color: 'inherit',
      textDecoration: 'underline',
      '&:hover': {
        textDecoration: 'underline dotted',
      },
      '&:active, &:hover': {
        outlineWidth: 0,
      },
      '&:not([href])': {
        color: 'inherit',
        textDecoration: 'none',
      },
    },

    // Headings
    'h1, h2, h3, h4, h5, h6': {
      marginTop: 0,
      marginBottom: kbnMarkdownSizeXS,
    },
    h1: {
      fontSize: kbnMarkdownFontSizeXXL,
      lineHeight: '1.333333em',
      fontWeight: 300,
    },
    h2: {
      fontSize: kbnMarkdownFontSizeXL,
      lineHeight: '1.428571em',
      fontWeight: 300,
    },
    h3: {
      fontSize: kbnMarkdownFontSizeL,
      lineHeight: '1.6em',
      fontWeight: 600,
    },
    h4: {
      fontSize: kbnMarkdownSize,
      lineHeight: '1.5em',
      fontWeight: 600,
    },
    h5: {
      fontSize: kbnMarkdownFontSize,
      lineHeight: '1.142857em',
      fontWeight: 700,
    },
    h6: {
      fontSize: kbnMarkdownFontSizeS,
      lineHeight: '1.333333em',
      fontWeight: 700,
      textTransform: 'uppercase',
    },

    // Images
    img: {
      maxWidth: '100%',
      boxSizing: 'content-box',
      borderStyle: 'none',
      pointerEvents: 'auto',
    },

    // Blockquotes
    blockquote: {
      padding: '0 1em',
      borderLeft: `${kbnMarkdownSizeXXS} solid ${kbnMarkdownAlphaLightShade}`,
      ...(isReversed && {
        borderLeftColor: `${kbnMarkdownAlphaLightShadeReversed}`,
      }),
    },

    // Horizontal rules
    hr: {
      overflow: 'hidden',
      background: 'transparent',
      height: '2px',
      padding: 0,
      margin: `${kbnMarkdownSizeL} 0`,
      backgroundColor: `${kbnMarkdownAlphaLightShade}`,
      border: 0,

      '::before': {
        display: 'table',
        content: '"',
      },
      '::after': {
        display: 'table',
        clear: 'both',
        content: '"',
      },
      ...(isReversed && {
        backgroundColor: kbnMarkdownAlphaLightShadeReversed,
      }),
    },

    // Lists
    'ul, ol': {
      paddingLeft: `${kbnMarkdownSizeL}`,
      marginTop: 0,
      marginBottom: `${kbnMarkdownSize}`,
    },
    ul: {
      listStyleType: 'disc',
    },
    ol: {
      listStyleType: 'decimal',
    },
    'ul ul': {
      listStyleType: 'circle',
    },
    'ol ol, ul ol': {
      listStyleType: 'lower-roman',
    },
    'ul ul ol, ul ol ol, ol ul ol, ol ol ol': {
      listStyleType: 'lower-alpha',
    },
    dd: {
      marginLeft: 0,
    },
    // Nested lists with no margin
    'ul ul, ul ol, ol ol, ol ul': {
      marginTop: 0,
      marginBottom: 0,
    },
    'li > p': {
      marginBottom: `${kbnMarkdownSizeXS}`,
    },
    'li + li': {
      marginTop: `${kbnMarkdownSizeXXS}`,
    },

    // Tables
    table: {
      display: 'block',
      width: '100%',
      overflow: 'auto',
      borderLeft: `1px solid ${kbnMarkdownAlphaLightShade}`,
      borderSpacing: 0,
      borderCollapse: 'collapse',
      ...(isReversed && {
        borderLeftColor: `${kbnMarkdownAlphaLightShadeReversed}`,
      }),
    },
    'table th, table td': {
      padding: `${kbnMarkdownSizeXXS} ${kbnMarkdownSizeS}`,
      borderTop: `1px solid ${kbnMarkdownAlphaLightShade}`,
      borderBottom: `1px solid ${kbnMarkdownAlphaLightShade}`,
      '&:last-child': {
        borderRight: `1px solid ${kbnMarkdownAlphaLightShade}`,
      },
      ...(isReversed && {
        borderColor: `${kbnMarkdownAlphaLightShadeReversed}`,
      }),
    },
    'table tr': {
      backgroundColor: 'transparent',
      borderTop: `1px solid ${kbnMarkdownAlphaLightShade}`,
      ...(isReversed && {
        borderTopColor: `${kbnMarkdownAlphaLightShadeReversed}`,
      }),
    },

    // Code blocks
    'code, pre': {
      marginBottom: `${kbnMarkdownSizeXS}`,
      fontFamily: `'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace`,
      fontSize: `${kbnMarkdownFontSizeS}`,
    },
    code: {
      padding: `${kbnMarkdownSizeXXS} 0`,
      margin: 0,
      backgroundColor: `${kbnMarkdownAlphaLightestShade}`,
      borderRadius: `${kbnMarkdownSizeXXS}`,
      '&::before, &::after': {
        letterSpacing: '-.2em',
        content: '"\xa0"',
      },
      ...(isReversed && {
        backgroundColor: `${kbnMarkdownAlphaLightestShadeReversed}`,
      }),
    },

    pre: {
      padding: `${kbnMarkdownSize}`,
      overflow: 'auto',
      fontSize: `${kbnMarkdownFontSizeS}`,
      lineHeight: '1.333333em',
      backgroundColor: `${kbnMarkdownAlphaLightestShade}`,
      borderRadius: `${kbnMarkdownSizeXXS}`,
      wordWrap: 'normal',
      ...(isReversed && {
        backgroundColor: `${kbnMarkdownAlphaLightestShadeReversed}`,
      }),
    },
    'pre code': {
      display: 'inline',
      maxWidth: 'auto',
      padding: 0,
      overflow: 'visible',
      lineHeight: 'inherit',
      wordWrap: 'normal',
      whiteSpace: 'pre',
      backgroundColor: 'transparent',
      border: 0,
      '&::before, &::after': {
        content: 'normal',
      },
    },
  });
};
