/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const visorStyles = (
  euiTheme: EuiThemeComputed,
  comboBoxWidth: number,
  isSpaceReduced: boolean,
  isVisible: boolean
) => {
  return {
    visorWrapper: {
      background: 'linear-gradient(107.9deg, rgb(11, 100, 221) 21.85%, rgb(255, 39, 165) 98.82%)',
      padding: '1px',
      width: isSpaceReduced ? '90%' : '50%',
      height: isVisible ? euiTheme.size.xxl : '0',
      boxShadow: 'rgba(11, 14, 22, 0.03) 0px 6px 14px 0px',
      margin: isVisible ? `0 auto ${euiTheme.size.base}` : '0 auto 0',
      borderRadius: euiTheme.size.s,
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
      overflow: 'hidden',
      transition: 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
    comboBoxWrapper: {
      background: euiTheme.colors.emptyShade,
      height: '100%',
      justifyContent: 'center',
      borderBottomLeftRadius: euiTheme.size.s,
      borderTopLeftRadius: euiTheme.size.s,
      paddingLeft: '2px',
      flexGrow: 1,
      maxWidth: `${comboBoxWidth}px`,
    },
    comboBoxStyles: css`
      .euiComboBox__inputWrap {
        box-shadow: none;
        border-radius: 0;
        border-right: 1px solid rgb(227, 232, 242);
      }
      .euiComboBox__inputWrap:focus,
      .euiComboBox__inputWrap:focus-within,
      .euiComboBox__inputWrap:hover {
        box-shadow: none !important;
        outline: none !important;
      }
    `,
    searchWrapper: css`
      background: ${euiTheme.colors.emptyShade};
      height: 100%;
      justify-content: center;
      border-bottom-right-radius: ${euiTheme.size.s};
      border-top-right-radius: ${euiTheme.size.s};
      padding-right: 2px;

      .euiFormControlLayout--group::after {
        border: none;
      }

      .euiFormControlLayout__append {
        background-color: ${euiTheme.colors.backgroundBasePlain};
        &::before {
          border: none;
        }
      }
    `,
    searchFieldStyles: css`
      box-shadow: none;
      border-radius: 0;
      &:focus,
      &:hover {
        box-shadow: none !important;
        outline: none !important;
      }
    `,
  };
};
