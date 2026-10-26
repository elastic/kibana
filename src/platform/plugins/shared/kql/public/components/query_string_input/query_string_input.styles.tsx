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
          // Icons are siblings of EuiTextArea's FormControlLayout wrapper, not of the
          // <textarea> itself — keep them above the field so the clear gutter can cover
          // glyphs that paint into the padding box (elastic/kibana#106963).
          zIndex: euiTheme.levels.flyout,
        },
        // Opaque gutter behind the clear control. EuiTextArea wraps the <textarea> in
        // EuiFormControlLayout, so a direct-child :has(> .kbnQueryBar__textarea--) never
        // matches; target the icons group that actually contains the clear button instead.
        // paddingRight alone cannot keep unbroken / nowrap glyphs from painting under the ×
        // because textarea overflow clips at the padding edge.
        //
        // Inset the scrim by the field border on the trailing / block edges so it covers
        // glyph paint without painting over the input border (review feedback on #289442).
        '> .euiFormControlLayoutIcons:has(.euiFormControlLayoutClearButton)': {
          backgroundColor: euiTheme.components.forms.background,
          // Match the clearable paddingRight affordance (xxl).
          width: euiTheme.size.xxl,
          justifyContent: 'center',
          // Stay inside the border — previous flush `insetInlineEnd: 0` covered it.
          insetInlineEnd: euiTheme.border.width.thin,
          top: euiTheme.border.width.thin,
          bottom: euiTheme.border.width.thin,
          height: 'auto',
          maxHeight: 'none',
          // Match EUI form control radius, stepped in by the border so corners align.
          borderStartEndRadius: `calc(${euiTheme.border.radius.small} - ${euiTheme.border.width.thin})`,
          borderEndEndRadius: `calc(${euiTheme.border.radius.small} - ${euiTheme.border.width.thin})`,
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
          // Keeps the caret/selection out of the clear control; does NOT by itself
          // stop glyph paint under the × (padding-box overflow clip — see wrap scrim).
          paddingRight: euiTheme.size.xxl,
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
