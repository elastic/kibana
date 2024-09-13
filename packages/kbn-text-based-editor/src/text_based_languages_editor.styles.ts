/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';

export const EDITOR_INITIAL_HEIGHT = 80;
export const EDITOR_INITIAL_HEIGHT_INLINE_EDITING = 140;
export const EDITOR_MIN_HEIGHT = 40;
export const EDITOR_MAX_HEIGHT = 400;
// resizeable container initial height
// the resizable container is the container that holds the history component or the inline docs
// they are never open simultaneously
export const RESIZABLE_CONTAINER_INITIAL_HEIGHT = 190;

export const textBasedLanguageEditorStyles = (
  euiTheme: EuiThemeComputed,
  editorHeight: number,
  hasErrors: boolean,
  hasWarning: boolean,
  isCodeEditorExpandedFocused: boolean,
  editorIsInline: boolean,
  hasOutline: boolean
) => {
  const bottomContainerBorderColor = hasErrors
    ? euiTheme.colors.danger
    : euiTheme.colors.lightestShade;

  return {
    editorContainer: {
      position: 'relative' as const,
      left: 0,
      right: 0,
      zIndex: 4,
      height: `${editorHeight}px`,
    },
    resizableContainer: {
      display: 'flex',
      width: '100%',
      alignItems: 'flex-start',
      border: hasOutline ? euiTheme.border.thin : 'none',
      borderBottom: 'none',
      overflow: 'hidden',
    },
    linesBadge: {
      position: 'absolute' as const,
      zIndex: 1,
      right: hasErrors || hasWarning ? '60px' : '12px',
      top: '50%',
      transform: 'translate(0, -50%)',
    },
    errorsBadge: {
      position: 'absolute' as const,
      zIndex: 1,
      right: '12px',
      top: '50%',
      transform: 'translate(0, -50%)',
    },
    bottomContainer: {
      borderTop: !isCodeEditorExpandedFocused
        ? hasErrors
          ? `2px solid ${euiTheme.colors.danger}`
          : `2px solid ${euiTheme.colors.lightestShade}`
        : `2px solid ${bottomContainerBorderColor}`,
      backgroundColor: euiTheme.colors.body,
      paddingLeft: euiTheme.size.xs,
      paddingRight: euiTheme.size.xs,
      paddingTop: editorIsInline ? euiTheme.size.s : euiTheme.size.xs,
      paddingBottom: editorIsInline ? euiTheme.size.s : euiTheme.size.xs,
      width: '100%',
      position: 'relative' as const,
      marginTop: 0,
      marginLeft: 0,
      marginBottom: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    historyContainer: {
      border: 'none',
      backgroundColor: euiTheme.colors.lightestShade,
      width: '100%',
      position: 'relative' as const,
      marginTop: 0,
      marginLeft: 0,
      marginBottom: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    topContainer: {
      border: 'none',
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      backgroundColor: euiTheme.colors.lightestShade,
      paddingLeft: euiTheme.size.s,
      paddingRight: euiTheme.size.s,
      paddingTop: euiTheme.size.s,
      paddingBottom: euiTheme.size.s,
      width: '100%',
      position: 'relative' as const,
      marginLeft: 0,
      marginTop: editorIsInline ? 0 : euiTheme.size.s,
      borderBottom: 'none',
    },
    dragResizeContainer: {
      width: '100%',
      cursor: 'row-resize',
      textAlign: 'center' as 'center',
      height: euiTheme.size.base,
    },
    dragResizeButton: {
      cursor: 'row-resize',
    },
  };
};
