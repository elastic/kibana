/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { PanelInteractionEvent } from '../types';

export const DragHandle = ({
  interactionStart,
}: {
  interactionStart: (
    type: PanelInteractionEvent['type'] | 'drop',
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      aria-label={i18n.translate('kbnGridLayout.dragHandle.ariaLabel', {
        defaultMessage: 'Drag to move',
      })}
      className="kbnGridPanel__dragHandle"
      css={css`
        opacity: 0;
        display: flex;
        cursor: move;
        position: absolute;
        align-items: center;
        justify-content: center;
        top: -${euiThemeVars.euiSizeL};
        width: ${euiThemeVars.euiSizeL};
        height: ${euiThemeVars.euiSizeL};
        z-index: ${euiThemeVars.euiZLevel3};
        margin-left: ${euiThemeVars.euiSizeS};
        border: 1px solid ${euiTheme.border.color};
        border-bottom: none;
        background-color: ${euiTheme.colors.emptyShade};
        border-radius: ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius} 0 0;
        cursor: grab;
        transition: ${euiThemeVars.euiAnimSpeedSlow} opacity;
        .kbnGridPanel:hover &,
        .kbnGridPanel:focus-within &,
        &:active,
        &:focus {
          opacity: 1 !important;
        }
        &:active {
          cursor: grabbing;
        }
        .kbnGrid--static & {
          display: none;
        }
      `}
      onMouseDown={(e) => {
        interactionStart('drag', e);
      }}
      onMouseUp={(e) => {
        interactionStart('drop', e);
      }}
    >
      <EuiIcon type="grabOmnidirectional" />
    </button>
  );
};
