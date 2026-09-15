/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { actionIconTileStyles } from './action_icon_tile.styles';
import { kbdStyles } from '../../../widgets/workflow_yaml_editor/ui/kbd_styles';

/**
 * Layout that EUI components cannot express on their own:
 * modal split panes, selectable overflow, and command shortcut keys.
 */
export const componentStyles = {
  fill: css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.m}`,
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  body: css({
    height: 'min(520px, calc(100vh - 160px))',
    overflow: 'hidden',
  }),
  leftColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 50%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  listFill: css({
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    '& > *': {
      flex: 1,
      minHeight: 0,
    },
    // Square rows; own padding lives on optionPad (EUI list items add their own).
    '.euiSelectableListItem': {
      borderRadius: 0,
      padding: 0,
    },
    '.euiSelectableListItem__text': {
      padding: 0,
    },
  }),
  optionInfo: css({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  }),
  optionDescription: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  breadcrumbRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      marginTop: -1,
      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  rightColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      userSelect: 'text',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  optionPad: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      padding: euiTheme.size.base,
      boxSizing: 'border-box',
    }),
  shortcutContainer: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      display: 'inline-flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: euiTheme.size.xxs,
      flexShrink: 0,
      '& kbd': {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        fontFamily: euiTheme.font.familyCode,
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.medium,
        lineHeight: 1,
        color: euiTheme.colors.textSubdued,
        backgroundColor: 'transparent',
        ...kbdStyles(euiThemeContext),
      },
    });
  },
  ...actionIconTileStyles,
};
