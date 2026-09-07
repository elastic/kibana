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
  titleRow: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  closeButton: css({
    marginRight: '-4px',
  }),
  title: css({
    margin: 0,
    fontSize: '12.25px',
    lineHeight: '20px',
  }),
  searchRow: css({
    '& .euiFieldSearch': {
      width: '100%',
    },
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
      willChange: 'transform',
      '& > *': {
        flex: 1,
        minHeight: 0,
      },
    }),
  breadcrumbRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      // Overlap the header border so subpixel centering (panel translate) can't leave a hairline
      marginTop: -1,
      padding: `8px 16px`,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      position: 'relative',
      zIndex: 1,
      fontSize: '12px',
      '& .euiBreadcrumb, & .euiBreadcrumb__content, & .euiBreadcrumbs__list': {
        fontSize: '12px',
      },
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
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  selectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      '& .euiSelectableListItem': {
        padding: 0,
        borderRadius: 0,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      },
      '& .euiSelectableListItem:last-child': {
        borderBottom: 'none',
      },
      '& .euiSelectableList': {
        flex: 1,
        height: '100%',
        maxHeight: 'none',
        overflowY: 'auto',
        padding: 0,
      },
      '& .euiSelectableList__list': {
        // Kill EUI scroll-shadow inset so the first row sits flush under breadcrumbs
        paddingTop: '0 !important',
        maskImage: 'none',
        WebkitMaskImage: 'none',
        '&::before, &::after': {
          content: 'none !important',
          display: 'none !important',
        },
        // Breathing room under the search header when a section label leads the list
        '& > ul:has(> .euiSelectableList__groupLabel:first-child)': {
          paddingTop: '16px',
        },
      },
      '& .euiSelectableList__groupLabel': {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        padding: `6px 12px 6px 16px`,
        fontSize: '12.25px',
        fontWeight: 700,
        color: euiTheme.colors.textParagraph,
        borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        // Opaque so list rows don't show through while the header is stuck
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        // EUI draws a top rule via ::before on later section labels — remove it
        '&::before': {
          content: 'none',
          display: 'none',
        },
      },
      // Exactly 24px from the previous item to the next section label text
      // (EUI also adds extra padding-top on later labels — zero that out).
      '& .euiSelectableList__groupLabel ~ .euiSelectableList__groupLabel': {
        marginTop: '24px',
        paddingTop: 0,
      },
      '& .euiSelectableListItem__content': {
        gap: 0,
        borderRadius: 0,
      },
      '& .euiSelectableListItem__text': {
        padding: 0,
        borderRadius: 0,
        // Never underline option text — EUI focus/hover styles add it by default
        textDecoration: 'none !important',
      },
      // EuiListItemLayout defaults to a small radius; keep category rows square.
      '& .euiListItemLayout': {
        borderRadius: 0,
      },
      // EUI keeps a focused row after mouseDown; suppress that so only hover OR our
      // keyboard-active row shows the highlight (one at a time).
      '& .euiSelectableListItem.euiSelectableListItem-isFocused:not(:hover):not(:has(.actionsMenu-keyboardActive)), & .euiSelectableListItem[aria-selected="true"]:not(:hover):not(:has(.actionsMenu-keyboardActive))':
        {
          backgroundColor: `${euiTheme.colors.backgroundBasePlain} !important`,
          color: 'inherit',
        },
      '& .euiSelectableListItem:hover, & .euiSelectableListItem:has(.actionsMenu-keyboardActive)': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        color: 'inherit',
      },
      // Info / plus affordances only on hovered or keyboard-active leaf rows
      '& .euiSelectableListItem .rowActions': {
        opacity: 0,
        pointerEvents: 'none',
      },
      '& .euiSelectableListItem:hover .rowActions, & .euiSelectableListItem:has(.actionsMenu-keyboardActive) .rowActions':
        {
          opacity: 1,
          pointerEvents: 'auto',
        },
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
  // Icon tile — 40x40, 8px radius
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
  // AI — Primary→Assistance gradients (same recipe as AiButton / AI Agent)
  iconOuterPlatform: aiIconTileCss,
  // Triggers — Backgrounds/Base/Accent + Borders/Base/Accent (Text/Accent on glyph)
  iconOuterTrigger: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccent,
      border: `1px solid ${euiTheme.colors.borderBaseAccent}`,
    }),
  // ES / Kibana / External — match External systems & apps
  // Backgrounds/Base/Subdued + Borders/Base/Plain (Text/Paragraph on glyph)
  iconOuterAppLogo: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  // Commands — same as External systems & apps
  iconOuterCommand: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  // Data transformation — Backgrounds/Base/Warning + Borders/Base/Warning
  iconOuterDataTransformation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      border: `1px solid ${euiTheme.colors.borderBaseWarning}`,
    }),
  // Flow control — Backgrounds/Base/Accent secondary + Borders/Base/Accent secondary
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
  rowActions: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  }),
  // 32×32 icon buttons — Info empty; Add uses display="base" (border) for hierarchy
  rowActionButton: css({
    inlineSize: '32px',
    blockSize: '32px',
    width: '32px',
    height: '32px',
  }),
  viewAllLink: ({ euiTheme }: UseEuiTheme) =>
    css({
      cursor: 'pointer',
      width: '100%',
      color: euiTheme.colors.primaryText,
      '& .euiIcon': {
        color: euiTheme.colors.primaryText,
      },
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
  // Match Keyboard shortcuts panel / Actions menu button kbd chips
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
