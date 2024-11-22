/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { useDispatch } from 'react-redux';
import { changeAlpha } from '../../color/color_math';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { getGradientColorScale } from '../../color/color_handling';
import { AddStop } from './gradient_add_stop';
import { ColorSwatch } from '../color_picker/color_swatch';
import { updateGradientColorStep } from '../../state/color_mapping';

export function Gradient({
  paletteId,
  colorMode,
  getPaletteFn,
  isDarkMode,
}: {
  paletteId: string;
  isDarkMode: boolean;
  colorMode: ColorMapping.Config['colorMode'];
  getPaletteFn: ReturnType<typeof getPalette>;
}) {
  const dispatch = useDispatch();
  if (colorMode.type === 'categorical') {
    return null;
  }

  const currentPalette = getPaletteFn(paletteId);
  const gradientColorScale = getGradientColorScale(colorMode, getPaletteFn, isDarkMode);

  const startStepColor =
    colorMode.sort === 'asc'
      ? colorMode.steps.length === 1
        ? undefined
        : colorMode.steps.at(-1)
      : colorMode.steps.at(0);
  const startStepIndex =
    colorMode.sort === 'asc'
      ? colorMode.steps.length === 1
        ? NaN
        : colorMode.steps.length - 1
      : 0;

  const endStepColor =
    colorMode.sort === 'asc'
      ? colorMode.steps.at(0)
      : colorMode.steps.length === 1
      ? undefined
      : colorMode.steps.at(-1);
  const endStepIndex =
    colorMode.sort === 'asc' ? 0 : colorMode.steps.length === 1 ? NaN : colorMode.steps.length - 1;

  const middleStepColor = colorMode.steps.length === 3 ? colorMode.steps[1] : undefined;
  const middleStepIndex = colorMode.steps.length === 3 ? 1 : NaN;

  return (
    <div
      css={css`
        position: relative;
        height: 24px;
        &:hover {
          button {
            opacity: 1;
          }
        }
      `}
    >
      <div
        css={css`
          position: absolute;
          left: 6px;
          right: 6px;
          height: 8px;
          top: 12px;
          border-radius: 6px;
          background-origin: border-box;
          background-image: linear-gradient(
            to right,
            ${[gradientColorScale(0), gradientColorScale(0.5), gradientColorScale(1)].join(',')}
          );
          border: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
        `}
      />

      <div
        css={css`
          position: absolute;
          left: 0;
          top: 6px;
        `}
      >
        {startStepColor ? (
          <ColorSwatch
            forType="gradient"
            colorMode={colorMode}
            assignmentColor={startStepColor}
            getPaletteFn={getPaletteFn}
            index={startStepIndex}
            palette={currentPalette}
            total={colorMode.steps.length}
            swatchShape="round"
            isDarkMode={isDarkMode}
            onColorChange={(color) => {
              dispatch(updateGradientColorStep({ index: startStepIndex, color }));
            }}
          />
        ) : (
          <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
        )}
      </div>

      <div
        css={css`
          position: absolute;
          width: 16px;
          height: 16px;
          left: 50%;
          top: 8px;
        `}
      >
        {middleStepColor ? (
          <ColorSwatch
            forType="gradient"
            colorMode={colorMode}
            assignmentColor={middleStepColor}
            getPaletteFn={getPaletteFn}
            index={middleStepIndex}
            palette={currentPalette}
            total={colorMode.steps.length}
            swatchShape="round"
            isDarkMode={isDarkMode}
            onColorChange={(color) => {
              dispatch(updateGradientColorStep({ index: middleStepIndex, color }));
            }}
          />
        ) : colorMode.steps.length === 2 ? (
          <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
        ) : undefined}
      </div>
      <div
        css={css`
          position: absolute;
          width: 16px;
          height: 16px;
          top: 8px;
          right: 0;
        `}
      >
        {endStepColor ? (
          <ColorSwatch
            forType="gradient"
            colorMode={colorMode}
            assignmentColor={endStepColor}
            getPaletteFn={getPaletteFn}
            index={endStepIndex}
            palette={currentPalette}
            total={colorMode.steps.length}
            swatchShape="round"
            isDarkMode={isDarkMode}
            onColorChange={(color) => {
              dispatch(updateGradientColorStep({ index: endStepIndex, color }));
            }}
          />
        ) : (
          <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
        )}
      </div>
    </div>
  );
}
