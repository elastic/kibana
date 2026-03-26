/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const queryStringInputStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      zIndex: euiThemeVars.euiZContentMenu,
      height: euiTheme.size.xl,
      display: 'flex',
      '> [aria-expanded="true"]': {
        // Using filter allows it to adhere the children's bounds
        filter: `drop-shadow(0 ${euiTheme.size.s} ${euiTheme.size.base} rgba(${euiTheme.colors.shadow}, 0.05))`,
      },
      '.kbnQueryBar__textareaWrapOuter': {
        position: 'relative',
        width: '100%',
        zIndex: euiTheme.levels.flyout,
      },
      '.kbnQueryBar__textareaWrap': {
        position: 'relative',
        overflow: 'visible !important', // Override EUI form control
        display: 'flex',
        flex: '1 1 100%',
        '&.kbnQueryBar__textareaWrap--withSuggestionVisible .kbnQueryBar__textarea': {
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
        '> .euiFormControlLayoutIcons': {
          maxHeight: euiTheme.size.xxl,
        },
      },
      '.kbnQueryBar__textarea': {
        zIndex: euiTheme.levels.content,
        height: euiTheme.size.xl,
        // Unlike most inputs within layout control groups, the text area still needs a border
        // for multi-line content. These adjusts help it sit above the control groups
        // shadow to line up correctly.
        padding: euiTheme.size.xs,
        paddingTop: `calc(${euiTheme.size.xs} + 2px)`,
        paddingLeft: euiTheme.size.xxl, // Account for search icon
        // Firefox adds margin to textarea
        margin: 0,

        '&.kbnQueryBar__textarea--isClearable': {
          paddingRight: euiTheme.size.xxl, // Account for clear button
        },

        '&:not(.kbnQueryBar__textarea--autoHeight)': {
          overflowY: 'hidden',
          overflowX: 'hidden',
          wordBreak: 'break-all',
        },

        // When focused, let it scroll
        '&.kbnQueryBar__textarea--autoHeight': {
          overflowX: 'auto',
          overflowY: 'auto',
          whiteSpace: `pre-wrap`,
          maxHeight: `calc(35vh - 100px)`,
          minHeight: euiTheme.size.xl,
        },

        '~.euiFormControlLayoutIcons': {
          // By default form control layout icon is vertically centered, but our textarea
          // can expand to be multi-line, so we position it with padding that matches
          // the parent textarea padding
          zIndex: euiTheme.levels.flyout,
          top: euiTheme.size.m,
          bottom: 'unset',
        },

        '&.kbnQueryBar__textarea--withPrepend': {
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          marginLeft: '-1px',
          width: 'calc(100% + 1px)',
        },
      },
    }),
};

export const StyledDiv = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const styles = useMemoCss(queryStringInputStyles);
  return (
    <div css={styles.container} {...props}>
      {children}
    </div>
  );
};
