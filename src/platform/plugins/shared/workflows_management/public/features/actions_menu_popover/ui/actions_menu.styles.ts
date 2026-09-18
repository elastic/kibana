/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { aiIconTileCss } from './ai_icon_tile';

export const componentStyles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `16px ${euiTheme.size.base} 12px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  title: css({
    margin: 0,
    fontSize: '12.25px',
    lineHeight: '20px',
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
      borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  listViewport: css({
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  }),
  listPane: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& > *': {
        flex: 1,
        minHeight: 0,
      },
    }),
  breadcrumbRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      marginTop: -1,
      padding: `8px 16px`,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      position: 'relative',
      zIndex: 1,
      fontSize: '12px',
    }),
  noResults: css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
  }),
  rightColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      userSelect: 'text',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  selectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
  actionOptionWrapper: css({
    width: '100%',
    padding: `12px 16px`,
  }),
  compactOptionWrapper: css({
    width: '100%',
    padding: `12px 16px`,
  }),
  actionOption: css({
    gap: '11px',
  }),
  actionInfo: css({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }),
  iconOuter: css({
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    boxSizing: 'border-box',
  }),
  iconOuterPlatform: aiIconTileCss,
  iconOuterTrigger: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccent,
      border: `1px solid ${euiTheme.colors.borderBaseAccent}`,
    }),
  iconOuterAppLogo: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  iconOuterCommand: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  iconOuterDataTransformation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      border: `1px solid ${euiTheme.colors.borderBaseWarning}`,
    }),
  iconOuterFlowControl: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccentSecondary,
      border: `1px solid ${euiTheme.colors.borderBaseAccentSecondary}`,
    }),
  groupIconInner: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  }),
  actionIconInner: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  }),
  arrowContainer: css({
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  }),
  arrow: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textSubdued,
    }),
  viewAllLink: ({ euiTheme }: UseEuiTheme) =>
    css({
      cursor: 'pointer',
      width: '100%',
      color: euiTheme.colors.primaryText,
    }),
  actionTitle: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
      '&::first-letter': {
        textTransform: 'capitalize',
      },
      '& h6': {
        fontSize: '12.25px',
        fontWeight: 700,
      },
    }),
  actionDescription: (euiThemeContext: UseEuiTheme) =>
    css({
      lineHeight: euiFontSize(euiThemeContext, 's').lineHeight,
      fontSize: '12px',
      color: euiThemeContext.euiTheme.colors.textSubdued,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      display: 'block',
    }),
  techPreviewBadge: css({
    marginBottom: '-4px',
  }),
  shortcutContainer: css({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  }),
  shortcutKey: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 20,
      textAlign: 'center',
      padding: `${euiTheme.size.xxs} ${euiTheme.size.xs}`,
      borderRadius: euiTheme.border.radius.small,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: 'transparent',
      color: euiTheme.colors.textSubdued,
      fontFamily: euiTheme.font.familyCode,
      fontSize: '12px',
      fontWeight: euiTheme.font.weight.medium,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
    }),
};
