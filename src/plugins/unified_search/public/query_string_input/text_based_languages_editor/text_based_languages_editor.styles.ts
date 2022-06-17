/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiThemeComputed } from '@elastic/eui';

export const EDITOR_INITIAL_HEIGHT = 40;

export const textBasedLanguagedEditorStyles = (
  euiTheme: EuiThemeComputed,
  isCompactFocused: boolean,
  editorHeight: number
) => {
  return {
    editorContainer: {
      position: isCompactFocused ? ('absolute' as 'absolute') : ('relative' as 'relative'), // cast string to type 'relative' | 'absolute'
      zIndex: isCompactFocused ? 1 : 0,
      height: `${editorHeight}px`,
      border: isCompactFocused ? euiTheme.border.thin : 'none',
    },
    resizableContainer: {
      display: 'flex',
      width: '100%',
      alignItems: isCompactFocused ? 'flex-start' : 'center',
      border: !isCompactFocused ? euiTheme.border.thin : 'none',
    },
    linesBadge: {
      position: 'absolute' as 'absolute', // cast string to type 'absolute',
      zIndex: 1,
      right: '16px',
      top: '50%',
      transform: 'translate(0, -50%)',
    },
    bottomContainer: {
      borderTop: `1px solid ${euiTheme.colors.primary}`,
      borderBottom: euiTheme.border.thin,
      backgroundColor: euiTheme.colors.lightestShade,
      paddingLeft: euiTheme.size.s,
      paddingRight: euiTheme.size.s,
      position: 'relative' as 'relative', // cast string to type 'relative',
      marginTop: 0,
    },
  };
};
