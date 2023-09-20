/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import chroma from 'chroma-js';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useDispatch } from 'react-redux';

import { changeAlpha, getValidColor, combineColors } from '../../color/color_math';

import { ColorMapping } from '../../config';
import { ColorSwatch } from '../color_picker/color_swatch';
import { getPalette } from '../../palettes';

import './gradient.scss';

import { addGradientColorStep, updateGradientColorStep } from '../../state/color_mapping';
import { colorPickerVisibility } from '../../state/ui';

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
  const currentPalette = getPaletteFn(paletteId);
  const gradientColorSteps =
    colorMode.type === 'gradient'
      ? colorMode.steps.length === 1
        ? [
            getColor(colorMode.steps[0], getPaletteFn, isDarkMode),
            combineColors(
              changeAlpha(getColor(colorMode.steps[0], getPaletteFn, isDarkMode), 0.3),
              isDarkMode ? 'black' : 'white'
            ),
          ].sort(() => (colorMode.sort === 'asc' ? -1 : 1))
        : colorMode.steps.map((d) => getColor(d, getPaletteFn, isDarkMode))
      : [];

  const gradientColorScale = chroma.scale(gradientColorSteps).mode('lab');
  const gradientCSSBackground =
    colorMode.type === 'gradient'
      ? colorMode.steps.length === 1
        ? gradientColorSteps.join(',')
        : Array.from({ length: 10 }, (d, i) => gradientColorScale(i / 10).hex())
            .sort(() => (colorMode.sort === 'asc' ? -1 : 1))
            .join(',')
      : '';

  return colorMode.type === 'categorical' ? null : (
    <div style={{ position: 'relative', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          width: 5,
          top: 18,
          bottom: 13,
          left: 5,
          backgroundImage: `linear-gradient(to bottom, ${gradientCSSBackground})`,
          zIndex: 0,
          borderRadius: 5,
        }}
      />
      <EuiFlexGroup
        direction={colorMode.sort === 'asc' ? 'columnReverse' : 'column'}
        alignItems="stretch"
        justifyContent="spaceBetween"
        style={{ position: 'relative', height: '100%' }}
      >
        {colorMode.steps.length === 1 ? (
          <>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <ColorStop
                key={`${0}`}
                colorMode={colorMode}
                step={colorMode.steps[0]}
                index={0}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
            </EuiFlexItem>
          </>
        ) : colorMode.steps.length === 2 ? (
          <>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <ColorStop
                key={`${0}`}
                colorMode={colorMode}
                step={colorMode.steps[0]}
                index={0}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <AddStop colorMode={colorMode} currentPalette={currentPalette} at={1} />
            </EuiFlexItem>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <ColorStop
                key={`${1}`}
                colorMode={colorMode}
                step={colorMode.steps[1]}
                index={1}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            </EuiFlexItem>
          </>
        ) : (
          <>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <ColorStop
                key={`${0}`}
                colorMode={colorMode}
                step={colorMode.steps[0]}
                index={0}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <ColorStop
                key={`${1}`}
                colorMode={colorMode}
                step={colorMode.steps[1]}
                index={1}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ width: 16 }} grow={0}>
              <ColorStop
                key={`${2}`}
                colorMode={colorMode}
                step={colorMode.steps[2]}
                index={2}
                currentPalette={currentPalette}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
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
  const dispatch = useDispatch();
  return (
    <EuiButtonEmpty
      iconType="plusInCircleFilled"
      disabled={colorMode.steps.length >= 3}
      style={{ color: '#696F7D', width: 16, height: 16, paddingLeft: 12 }}
      className="colorMappingGradientAddStop"
      size="s"
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
    />
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
  colorMode: {
    type: 'gradient';
    steps: Array<(ColorMapping.CategoricalColor | ColorMapping.ColorCode) & { touched: boolean }>;
    sort: 'asc' | 'desc';
  };
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

function getColor(
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode,
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean
) {
  return color.type === 'colorCode'
    ? color.colorCode
    : getValidColor(getPaletteFn(color.paletteId).getColor(color.colorIndex, isDarkMode)).hex();
}
