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
          css={css`
            position: relative;
            border-radius: 50%;
            width: 17px;
            height: 17px;
            padding: 0 0.5px;
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
              width: 15px;
              height: 15px;
              border-radius: 50%;
              transition: 200ms background-color;
              background-color: lightgrey;
              &:hover {
                background-color: #696f7d;
              }
              ${euiShadowSmall(euiTheme)}
            `}
          >
            <EuiIcon
              type="plus"
              css={css`
                position: absolute;
                top: 0.5px;
                left: 0;
                transition: 200ms fill;
                &:hover {
                  fill: white;
                }
              `}
              color={'#696f7d'}
            />
          </div>
        </button>
      </EuiToolTip>
    </>
  );
}
