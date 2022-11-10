/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const { euiTheme } = useEuiTheme();

export const codeEditorMonacoStyles = () => css`
   {
    animation: none !important; // Removes textarea EUI blue underline animation from EUI
  }
`;

export const codeEditorStyles = () => css`
   {
    position: relative;
    height: 100%;
  }
`;

export const codeEditorControlsStyles = () => css`
   {
    top: ${euiTheme.size.xs};
    right: ${euiTheme.base};
    position: absolute;
    z-index: 1000;
  }
`;

export const codeEditorFullScreenStyles = () => css`
   {
    position: absolute;
    left: 0;
    top: 0;
    .kibanaCodeEditor__controls {
      top: ${euiTheme.size.l};
      right: ${euiTheme.size.l};
    }
  }
`;

export const codeEditorPlaceholderStyles = () => css`
   {
    color: ${euiTheme.colors.subduedText};
    width: max-content;
    pointer-events: none;
  }
`;

export const codeEditorKeyboardHintStyles = () => css`
   {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;

    &:focus {
      // $euiZLevel1
      z-index: ${euiTheme.levels.mask};
    }

    &--isInactive {
      display: none;
    }
  }
`;
