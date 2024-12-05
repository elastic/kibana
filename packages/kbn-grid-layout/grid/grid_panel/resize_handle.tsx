/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { PanelInteractionEvent } from '../types';

export const ResizeHandle = ({
  interactionStart,
}: {
  interactionStart: (
    type: PanelInteractionEvent['type'] | 'drop',
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}) => {
  return (
    <button
      className="kbnGridPanel__resizeHandle"
      onMouseDown={(e) => {
        interactionStart('resize', e);
      }}
      onMouseUp={(e) => {
        interactionStart('drop', e);
      }}
      aria-label={i18n.translate('kbnGridLayout.resizeHandle.ariaLabel', {
        defaultMessage: 'Resize panel',
      })}
      css={css`
        right: 0;
        bottom: 0;
        opacity: 0;
        margin: -2px;
        position: absolute;
        width: ${euiThemeVars.euiSizeL};
        height: ${euiThemeVars.euiSizeL};
        transition: opacity 0.2s, border 0.2s;
        border-radius: 7px 0 7px 0;
        border-bottom: 2px solid ${euiThemeVars.euiColorSuccess};
        border-right: 2px solid ${euiThemeVars.euiColorSuccess};
        &:hover,
        &:focus {
          outline-style: none !important;
          opacity: 1;
          background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.05)};
          cursor: se-resize;
        }
        .kbnGrid--static & {
          opacity: 0 !important;
          display: none;
        }
        .kbnGridPanel__dragHandle:has(~ &:hover) {
          opacity: 0 !important;
        }
        .kbnGridPanel__dragHandle:has(~ &:focus) {
          opacity: 0 !important;
        }
      `}
    />
  );
};
