/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButtonGroup,
  EuiColorPalettePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';

import { RootState, updatePalette } from '../../state/color_mapping';
import { ColorMapping } from '../../config';
import { updateAssignmentsPalette, updateColorModePalette } from '../../config/assignments';
import { getPalette } from '../../palette';

export function PaletteSelector({
  palettes,
  getPaletteFn,
  isDarkMode,
}: {
  getPaletteFn: ReturnType<typeof getPalette>;
  palettes: Map<string, ColorMapping.CategoricalPalette>;
  isDarkMode: boolean;
}) {
  const dispatch = useDispatch();
  const colorMode = useSelector((state: RootState) => state.colorMapping.colorMode);
  const model = useSelector((state: RootState) => state.colorMapping);

  const { paletteId } = model;

  const switchPaletteFn = useCallback(
    (selectedPaletteId: string, preserveColorChanges: boolean) => {
      dispatch(
        updatePalette({
          paletteId: selectedPaletteId,
          assignments: updateAssignmentsPalette(
            model.assignments,
            model.assignmentMode,
            model.colorMode,
            selectedPaletteId,
            getPaletteFn,
            preserveColorChanges
          ),
          colorMode: updateColorModePalette(
            model.colorMode,
            selectedPaletteId,
            preserveColorChanges
          ),
        })
      );
    },
    [getPaletteFn, model, dispatch]
  );

  const updateColorMode = useCallback(
    (type: 'gradient' | 'categorical', preserveColorChanges: boolean) => {
      const updatedColorMode: ColorMapping.Config['colorMode'] =
        type === 'gradient'
          ? {
              type: 'gradient',
              steps: [
                {
                  type: 'categorical',
                  paletteId,
                  colorIndex: 0,
                  touched: false,
                },
              ],
              sort: 'desc',
            }
          : { type: 'categorical' };

      const assignments = updateAssignmentsPalette(
        model.assignments,
        model.assignmentMode,
        updatedColorMode,
        paletteId,
        getPaletteFn,
        preserveColorChanges
      );
      dispatch(updatePalette({ paletteId, assignments, colorMode: updatedColorMode }));
    },
    [getPaletteFn, model, dispatch, paletteId]
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFormRow label="Palette">
            <EuiColorPalettePicker
              palettes={[...palettes.values()]
                .filter((d) => d.name !== 'Neutral')
                .map((palette) => ({
                  value: palette.id,
                  title: palette.name,
                  palette: Array.from({ length: palette.colorCount }, (_, i) => {
                    return palette.getColor(i, isDarkMode);
                  }),
                  type: 'fixed',
                }))}
              onChange={(selectedPaletteId) => {
                const hasChanges = model.assignments.some((a) => a.touched);
                const hasGradientChanges =
                  model.colorMode.type === 'gradient' &&
                  model.colorMode.steps.some((a) => a.touched);
                if (hasChanges || hasGradientChanges) {
                  const preserve = window.confirm(
                    'Do you want to preserve the color changes? (cancel for NO)'
                  );
                  switchPaletteFn(selectedPaletteId, preserve);
                } else {
                  switchPaletteFn(selectedPaletteId, false);
                }
              }}
              valueOfSelected={model.paletteId}
              selectionDisplay={'palette'}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Scale">
            <EuiButtonGroup
              legend="Scale"
              options={[
                {
                  id: `categorical`,
                  label: 'Categorical',
                  iconType: 'spaces',
                },
                {
                  id: `gradient`,
                  label: 'gradient',
                  iconType: 'heatmap',
                },
              ]}
              idSelected={colorMode.type}
              onChange={(id) => {
                const hasChanges = model.assignments.some((a) => a.touched);
                const hasGradientChanges =
                  model.colorMode.type === 'gradient' &&
                  model.colorMode.steps.some((a) => a.touched);

                if (hasChanges || hasGradientChanges) {
                  const okToSwitch = window.confirm(
                    `Switch to ${id} will clear all your custom color changes, are you Ok? (cancel for NO)`
                  );
                  if (okToSwitch) {
                    updateColorMode(id as 'gradient' | 'categorical', false);
                  }
                } else {
                  updateColorMode(id as 'gradient' | 'categorical', false);
                }
              }}
              isIconOnly
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
