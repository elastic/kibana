/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';

export const CodeEditorStyles = () => css`
    .react-monaco-editor-container .monaco-editor .inputarea:focus {
        animation: none !important; // Removes textarea EUI blue underline animation from EUI
      }
      
      .kibanaCodeEditor {
        position: relative;
        height: 100%;
      
        &__placeholderContainer {
          color: $euiTextSubduedColor;
          width: max-content;
          pointer-events: none;
        }
      
        &__keyboardHint {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          left: 0;
      
          &:focus {
            z-index: $euiZLevel1;
          }
      
          &--isInactive {
            display: none;
          }
        }
      
        &__controls {
          top: $euiSizeXS;
          right: $euiSize;
          position: absolute;
          z-index: 1000
        }
      
        &__isFullScreen {
          position: absolute;
          left: 0;
          top: 0;
          .kibanaCodeEditor__controls {
            top: $euiSizeL;
            right: $euiSizeL;
          }
        }
`;
