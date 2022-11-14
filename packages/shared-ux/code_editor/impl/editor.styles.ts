/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Property } from 'csstype';

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

export const codeEditorControlsStyles = ({ euiTheme }: UseEuiTheme) => css`
   {
    top: ${euiTheme.size.xs};
    right: ${euiTheme.base};
    position: absolute;
    z-index: 1000;
  }
`;

export const codeEditorFullScreenStyles = ({ euiTheme }: UseEuiTheme) => css`
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

export const codeEditorPlaceholderStyles = ({ euiTheme }: UseEuiTheme) => css`
   {
    color: ${euiTheme.colors.subduedText};
    width: max-content;
    pointer-events: none;
  }
`;

export const codeEditorKeyboardHintStyles = (levels: {
  content: Property.ZIndex;
  mask: Property.ZIndex;
  toast: Property.ZIndex;
  modal: Property.ZIndex;
  navigation: Property.ZIndex;
  menu: Property.ZIndex;
  header: Property.ZIndex;
  flyout: Property.ZIndex;
  maskBelowHeader: Property.ZIndex;
}) =>
  css`
     {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      left: 0;

      &:focus {
        z-index: ${levels.mask};
      }

      &--isInactive {
        display: none;
      }
    }
  `;
