/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import {
  euiCanAnimate,
  euiFocusRing,
  EuiIcon,
  euiShadowSmall,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ColorMapping } from '../../config';
import { addGradientColorStep } from '../../state/color_mapping';
import { colorPickerVisibility } from '../../state/ui';

export function AddStop({
  colorMode,
  currentPalette,
  at,
}: {
  colorMode: ColorMapping.GradientColorMode;
  currentPalette: ColorMapping.CategoricalPalette;
  at: number;
}) {
  const euiTheme = useEuiTheme();
  const dispatch = useDispatch();
  return (
    <>
      <EuiToolTip
        position="top"
        content={i18n.translate('coloring.colorMapping.container.addGradientStopButtonLabel', {
          defaultMessage: 'Add gradient stop',
        })}
      >
        <button
          id="lnsColorMappingGradientAddButton"
          css={css`
            position: relative;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            padding: 0;
            ${euiFocusRing(euiTheme)};
            opacity: 0;
            ${euiCanAnimate} {
              transition: opacity ${euiTheme.euiTheme.animation.fast} ease-in;
            }
          `}
          onClick={() => {
            dispatch(
              addGradientColorStep({
                color: {
                  type: 'categorical',
                  colorIndex: colorMode.steps.length,
                  paletteId: currentPalette.id,
                },
                at,
              })
            );
            dispatch(
              colorPickerVisibility({
                index: at,
                type: 'gradient',
                visible: true,
              })
            );
          }}
        >
          <div
            css={css`
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background-color: ${euiTheme.euiTheme.colors.emptyShade};
              transform-origin: center;
              transition: transform ${euiTheme.euiTheme.animation.fast} ease-in;
              &:hover {
                transform: scale(1.2);
              }
              ${euiShadowSmall(euiTheme)}
            `}
          >
            <EuiIcon
              type="plus"
              height={16}
              width={16}
              css={css`
                position: absolute;
                top: 0;
                left: 0;
                width: 16px;
                height: 16px;
              `}
              color={euiTheme.euiTheme.colors.text}
            />
          </div>
        </button>
      </EuiToolTip>
    </>
  );
}
