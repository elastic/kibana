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
import { aiIconTileCss } from './ai_icon_tile';

export const panelStyles = {
  sectionPanel: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    paddingTop: '12px',
    gap: '16px',
  }),
  sectionTitle: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '0 16px',
  }),
  stepListScroll: css({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '0 0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  }),
  stepList: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 auto',
      alignSelf: 'flex-start',
      boxSizing: 'border-box',
      width: 'calc(100% - 16px)',
      borderRadius: euiTheme.border.radius.medium,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
    }),
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      borderRadius: '4px',
      padding: `12px 16px 16px 16px`,
      gap: euiTheme.size.base,
    }),
  titleBlock: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }),
  titleBlockText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: euiTheme.font.weight.bold,
      lineHeight: '24px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
    }),
  detailActions: css({
    marginTop: '2px',
  }),
  descriptionText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: '18px',
      color: euiTheme.colors.textSubdued,
      margin: 0,
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 3,
      overflow: 'hidden',
    }),
  tabsAndFields: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }),
  tabs: css({
    flexShrink: 0,
  }),
  tabCount: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginInlineStart: euiTheme.size.xs,
    }),
  fieldList: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }),
  fieldRow: css({
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }),
  fieldLabelRow: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  typeBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: euiTheme.border.radius.small,
      backgroundColor: euiTheme.colors.backgroundLightText,
      color: euiTheme.colors.textParagraph,
      fontFamily: euiTheme.font.familyCode,
      fontSize: '10px',
      fontWeight: 600,
      lineHeight: '12px',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flexShrink: 1,
      verticalAlign: 'middle',
    }),
  fieldName: css({
    fontWeight: 600,
  }),
  requiredBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: 'auto',
      flexShrink: 0,
      fontSize: '10px',
      fontWeight: 500,
      lineHeight: '16px',
      color: euiTheme.colors.textDanger,
      letterSpacing: '0.02em',
    }),
  fieldDescription: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  }),
  fieldDivider: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '1px',
      backgroundColor: euiTheme.colors.borderBaseSubdued,
    }),
  emptyFields: css({
    padding: '16px',
  }),
  codeText: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      fontFamily: euiTheme.font.familyCode,
      fontSize: '12px',
      lineHeight: '19px',
      whiteSpace: 'pre',
    }),
  yamlPreview: css({
    padding: '16px',
  }),
};

export const defaultPanelStyles = {
  root: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }),
  hero: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      justifyContent: 'center',
      borderRadius: '4px',
      padding: `${euiTheme.size.base} 24px 24px 24px`,
    }),
  illustration: css({
    width: '128px',
    height: '128px',
    flexShrink: 0,
  }),
  heroText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: '24px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
      textAlign: 'center',
    }),
  cardsSection: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      margin: '16px',
      borderRadius: euiTheme.border.radius.medium,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
    }),
};

export const resourceCardStyles = {
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      width: '100%',
      padding: `12px ${euiTheme.size.base}`,
      border: 'none',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: 0,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      textAlign: 'left',
      textDecoration: 'none',
      color: 'inherit',
      cursor: 'pointer',
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        textDecoration: 'none',
      },
      '&:focus': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        outline: 'none',
      },
    }),
};

export const previewStepRowStyles = {
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      paddingRight: euiTheme.size.base,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      margin: 0,
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
      '& .rowActions': {
        opacity: 0,
        pointerEvents: 'none',
      },
      '&:hover .rowActions, &:focus-within .rowActions': {
        opacity: 1,
        pointerEvents: 'auto',
      },
    }),
  rowMain: css({
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    padding: '12px 0 12px 16px',
    gap: '11px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  }),
  iconContainer: css({
    width: '40px',
    height: '40px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    boxSizing: 'border-box',
  }),
  iconContainerPlatform: aiIconTileCss,
  iconContainerTrigger: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccent,
      border: `1px solid ${euiTheme.colors.borderBaseAccent}`,
    }),
  iconContainerAppLogo: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  iconContainerFlowControl: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccentSecondary,
      border: `1px solid ${euiTheme.colors.borderBaseAccentSecondary}`,
    }),
  iconContainerDataTransformation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      border: `1px solid ${euiTheme.colors.borderBaseWarning}`,
    }),
  info: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  }),
  labelText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '12px',
      fontWeight: 700,
      lineHeight: '15px',
      color: euiTheme.colors.textParagraph,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      display: 'block',
    }),
  description: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  }),
  chevron: css({
    flexShrink: 0,
  }),
  rowActions: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  }),
  rowActionButton: css({
    inlineSize: '32px',
    blockSize: '32px',
    width: '32px',
    height: '32px',
  }),
};
