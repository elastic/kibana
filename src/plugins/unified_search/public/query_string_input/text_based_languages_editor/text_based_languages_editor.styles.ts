/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiThemeComputed } from '@elastic/eui';

export const EDITOR_INITIAL_HEIGHT = 38;
export const EDITOR_INITIAL_HEIGHT_EXPANDED = 140;
export const EDITOR_MIN_HEIGHT = 40;
export const EDITOR_MAX_HEIGHT = 400;

export const textBasedLanguagedEditorStyles = (
  euiTheme: EuiThemeComputed,
  isCompactFocused: boolean,
  editorHeight: number,
  isCodeEditorExpanded: boolean,
  hasErrors: boolean
) => {
  let position = isCompactFocused ? ('absolute' as 'absolute') : ('relative' as 'relative'); // cast string to type 'relative' | 'absolute'
  if (isCodeEditorExpanded) {
    position = 'relative' as 'relative';
  }
  const bottomContainerBorderColor = hasErrors ? euiTheme.colors.danger : euiTheme.colors.primary;
  return {
    editorContainer: {
      position,
      zIndex: isCompactFocused ? 4 : 0,
      height: `${editorHeight}px`,
      border: isCompactFocused ? euiTheme.border.thin : 'none',
    },
    resizableContainer: {
      display: 'flex',
      width: isCodeEditorExpanded ? '100%' : 'calc(100% - 80px)',
      alignItems: isCompactFocused ? 'flex-start' : 'center',
      border: !isCompactFocused ? euiTheme.border.thin : 'none',
      borderBottomColor: hasErrors ? euiTheme.colors.danger : euiTheme.colors.lightShade,
    },
    linesBadge: {
      position: 'absolute' as 'absolute', // cast string to type 'absolute',
      zIndex: 1,
      right: hasErrors ? '64px' : '16px',
      top: '50%',
      transform: 'translate(0, -50%)',
    },
    errorsBadge: {
      position: 'absolute' as 'absolute', // cast string to type 'absolute',
      zIndex: 1,
      right: '16px',
      top: '50%',
      transform: 'translate(0, -50%)',
    },
    bottomContainer: {
      border: euiTheme.border.thin,
      borderTop: isCodeEditorExpanded ? 'none' : `1px solid ${bottomContainerBorderColor}`,
      backgroundColor: euiTheme.colors.lightestShade,
      paddingLeft: euiTheme.size.s,
      paddingRight: euiTheme.size.s,
      position: 'relative' as 'relative', // cast string to type 'relative',
      marginTop: 0,
      marginLeft: 0,
    },
    topContainer: {
      border: euiTheme.border.thin,
      backgroundColor: euiTheme.colors.lightestShade,
      paddingLeft: euiTheme.size.s,
      paddingRight: euiTheme.size.s,
      position: 'relative' as 'relative', // cast string to type 'relative',
      marginLeft: 0,
      marginTop: euiTheme.size.s,
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
