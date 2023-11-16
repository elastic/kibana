/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { euiFocusRing, EuiIcon, euiShadowSmall, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { useDispatch } from 'react-redux';

import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { changeAlpha } from '../../color/color_math';

import { ColorMapping } from '../../config';
import { ColorSwatch } from '../color_picker/color_swatch';
import { getPalette } from '../../palettes';

import { addGradientColorStep, updateGradientColorStep } from '../../state/color_mapping';
import { colorPickerVisibility } from '../../state/ui';
import { getGradientColorScale } from '../../color/color_handling';

export function Gradient({
  paletteId,
  colorMode,
  getPaletteFn,
  isDarkMode,
  assignmentsSize,
}: {
  paletteId: string;
  isDarkMode: boolean;
  colorMode: ColorMapping.Config['colorMode'];
  getPaletteFn: ReturnType<typeof getPalette>;
  assignmentsSize: number;
}) {
  if (colorMode.type === 'categorical') {
    return null;
  }
  const currentPalette = getPaletteFn(paletteId);
  const gradientColorScale = getGradientColorScale(colorMode, getPaletteFn, isDarkMode);

  const topMostColorStop =
    colorMode.sort === 'asc'
      ? colorMode.steps.length === 1
        ? undefined
        : colorMode.steps.at(-1)
      : colorMode.steps.at(0);
  const topMostColorStopIndex =
    colorMode.sort === 'asc'
      ? colorMode.steps.length === 1
        ? NaN
        : colorMode.steps.length - 1
      : 0;

  const bottomMostColorStop =
    colorMode.sort === 'asc'
      ? colorMode.steps.at(0)
      : colorMode.steps.length === 1
      ? undefined
      : colorMode.steps.at(-1);
  const bottomMostColorStopIndex =
    colorMode.sort === 'asc' ? 0 : colorMode.steps.length === 1 ? NaN : colorMode.steps.length - 1;

  const middleMostColorSep = colorMode.steps.length === 3 ? colorMode.steps[1] : undefined;
  const middleMostColorStopIndex = colorMode.steps.length === 3 ? 1 : NaN;

  return (
    <>
      {assignmentsSize > 1 && (
        <div
          className="gradientLine"
          css={css`
            position: relative;
            grid-column: 1;
            grid-row: 1;
            width: 6px;
            margin-left: 5px;
            top: 16px;
            height: calc(100% - 12px);
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
            background-image: linear-gradient(
              to bottom,
              ${[gradientColorScale(0), gradientColorScale(1 / assignmentsSize)].join(',')}
            );
            border-left: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
            border-top: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
            border-right: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
          `}
        />
      )}
      <div
        className="gradientStop"
        css={css`
          position: relative;
          grid-column: 1;
          grid-row: 1;
          margin-top: 8px;
        `}
      >
        {topMostColorStop ? (
          <ColorStop
            colorMode={colorMode}
            step={topMostColorStop}
            index={topMostColorStopIndex}
            currentPalette={currentPalette}
            getPaletteFn={getPaletteFn}
            isDarkMode={isDarkMode}
          />
        ) : (
          <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
        )}
      </div>

      {assignmentsSize > 1 && (
        <div
          className="gradientLine"
          css={css`
            position: relative;
            z-index: 1;
            grid-column: 1;
            grid-row-start: 2;
            grid-row-end: ${assignmentsSize};
            background-image: linear-gradient(
              to bottom,
              ${[
                gradientColorScale(1 / assignmentsSize),
                gradientColorScale((assignmentsSize - 1) / assignmentsSize),
              ].join(',')}
            );
            margin: -4px 0;
            width: 6px;
            margin-left: 5px;
            ${assignmentsSize === 2 ? 'height: 0;' : ''};
            border-left: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
            border-right: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
          `}
        >
          <div
            css={css`
              position: absolute;
              width: 16px;
              height: 16px;
              top: calc(50% - 5px);
              margin-left: -6px;
              margin-top: -3px;
            `}
          >
            {middleMostColorSep ? (
              <ColorStop
                colorMode={colorMode}
                step={middleMostColorSep}
                index={middleMostColorStopIndex}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            ) : colorMode.steps.length === 2 ? (
              <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
            ) : undefined}
          </div>
        </div>
      )}
      {assignmentsSize > 1 && (
        <div
          className="gradientLine"
          css={css`
            position: relative;

            grid-column: 1;
            grid-row: ${assignmentsSize};
            background-image: linear-gradient(
              to bottom,

              ${[
                gradientColorScale((assignmentsSize - 1) / assignmentsSize),
                gradientColorScale(1),
              ].join(',')}
            );
            top: -4px;
            height: 24px;
            width: 6px;
            margin-left: 5px;
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
            border-left: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
            border-bottom: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
            border-right: 1px solid ${changeAlpha(euiThemeVars.euiColorDarkestShade, 0.2)};
          `}
        />
      )}

      <div
        css={css`
          position: relative;
          grid-column: 1;
          grid-row: ${assignmentsSize};
          width: 16px;
          height: 16px;
          margin-top: 8px;
        `}
      >
        {bottomMostColorStop ? (
          <ColorStop
            colorMode={colorMode}
            step={bottomMostColorStop}
            index={bottomMostColorStopIndex}
            currentPalette={currentPalette}
            getPaletteFn={getPaletteFn}
            isDarkMode={isDarkMode}
          />
        ) : (
          <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
        )}
      </div>
    </>
  );
}

function AddStop({
  colorMode,
  currentPalette,
  at,
}: {
  colorMode: {
    type: 'gradient';
    steps: Array<(ColorMapping.CategoricalColor | ColorMapping.ColorCode) & { touched: boolean }>;
  };
  currentPalette: ColorMapping.CategoricalPalette;
  at: number;
}) {
  const euiTheme = useEuiTheme();
  const dispatch = useDispatch();
  return (
    <button
      css={css`
        position: relative;
        border-radius: 50%;
        width: 17px;
        height: 17px;
        padding: 0 0.5px;
        ${euiFocusRing(euiTheme)};
      `}
      onClick={() => {
        dispatch(
          addGradientColorStep({
            color: {
              type: 'categorical',
              // TODO assign the next available color or a better one
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
  );
}

function ColorStop({
  colorMode,
  step,
  index,
  currentPalette,
  getPaletteFn,
  isDarkMode,
}: {
  colorMode: ColorMapping.GradientColorMode;
  step: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
  index: number;
  currentPalette: ColorMapping.CategoricalPalette;
  getPaletteFn: ReturnType<typeof getPalette>;
  isDarkMode: boolean;
}) {
  const dispatch = useDispatch();
  return (
    <ColorSwatch
      canPickColor={true}
      colorMode={colorMode}
      assignmentColor={step}
      getPaletteFn={getPaletteFn}
      index={index}
      palette={currentPalette}
      total={colorMode.steps.length}
      swatchShape="round"
      isDarkMode={isDarkMode}
      onColorChange={(color) => {
        dispatch(
          updateGradientColorStep({
            index,
            color,
          })
        );
      }}
      forType="gradient"
    />
  );
}
