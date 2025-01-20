/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { UserInteractionEvent, PanelInteractionEvent } from '../types';

export const ResizeHandle = ({
  interactionStart,
}: {
  interactionStart: (type: PanelInteractionEvent['type'] | 'drop', e: UserInteractionEvent) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      className="kbnGridPanel__resizeHandle"
      onMouseDown={(e) => {
        interactionStart('resize', e);
      }}
      onMouseUp={(e) => {
        interactionStart('drop', e);
      }}
      onTouchStart={(e) => {
        interactionStart('resize', e);
      }}
      onTouchEnd={(e) => {
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
        width: ${euiTheme.size.l};
        max-width: 100%;
        max-height: 100%;
        height: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.toast};
        transition: opacity 0.2s, border 0.2s;
        border-radius: 7px 0 7px 0;
        border-bottom: 2px solid ${euiTheme.colors.accentSecondary};
        border-right: 2px solid ${euiTheme.colors.accentSecondary};
        &:hover,
        &:focus {
          outline-style: none !important;
          opacity: 1;
          background-color: ${transparentize(euiTheme.colors.accentSecondary, 0.05)};
          cursor: se-resize;
        }
        .kbnGrid--static &,
        .kbnGridPanel--expanded & {
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
