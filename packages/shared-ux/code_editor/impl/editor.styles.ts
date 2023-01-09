/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComponentSelector, css, CSSObject, SerializedStyles } from '@emotion/react';
import { ArrayCSSInterpolation } from '@emotion/serialize';
import { Property } from 'csstype';

// .react-monaco-editor-container .monaco-editor .inputarea:focus
export const codeEditorMonacoStyles = () => css`
   {
    animation: none !important; // Removes textarea EUI blue underline animation from EUI
  }
`;

// .kibanaCodeEditor
export const codeEditorStyles = () => css`
   {
    position: relative;
    height: 100%;
  }
`;

// &__placeholderContainer
export const codeEditorPlaceholderContainerStyles = (subduedText: string) => css`
   {
    color: ${subduedText};
    width: max-content;
    pointer-events: none;
  }
`;

// &__keyboardHint
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

// &__controls
export const codeEditorControlsStyles = (
  size: {
    base: string;
    xxs: string;
    xs: string;
    s: string;
    m: string;
    l: string;
    xl: string;
    xxl: string;
    xxxl: string;
    xxxxl: string;
  },
  base:
    | string
    | number
    | boolean
    | ComponentSelector
    | SerializedStyles
    | CSSObject
    | ArrayCSSInterpolation
    | null
    | undefined
) => css`
   {
    top: ${size.xs};
    right: ${base};
    position: absolute;
    z-index: 1000;
  }
`;

// &__isFullScreen
export const codeEditorFullScreenStyles = () => css`
   {
    position: absolute;
    left: 0;
    top: 0;
  }
`;

// .kibanaCodeEditor_controls
export const codeEditorControlsWithinFullScreenStyles = (size: string) => css`
  top: ${size};
  right: ${size};
}`;
