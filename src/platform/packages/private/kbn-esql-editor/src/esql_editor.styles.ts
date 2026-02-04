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

export const esqlEditorStyles = (
  euiTheme: EuiThemeComputed,
  editorHeight: number,
  editorIsInline: boolean,
  hasOutline: boolean
) => {
  return {
    editorContainer: {
      position: 'relative' as const,
      left: 0,
      right: 0,
      zIndex: 4,
      height: `${editorHeight}px`,
      border: hasOutline ? euiTheme.border.thin : 'none',
    },
    resizableContainer: {
      display: 'flex',
      width: '100%',
      alignItems: 'flex-start',
      borderBottom: 'none',
      overflow: 'hidden',
    },
    bottomContainer: {
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
      width: '100%',
      position: 'relative' as const,
      marginTop: 0,
      marginLeft: 0,
      marginBottom: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
  };
};
