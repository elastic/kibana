/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButtonGroup,
  EuiColorPalettePicker,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RootState, updatePalette } from '../../state/color_mapping';
import { ColorMapping } from '../../config';
import { updateAssignmentsPalette, updateColorModePalette } from '../../config/assignments';
import { getPalette } from '../../palettes';

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

  const [preserveModalPaletteId, setPreserveModalPaletteId] = useState<string | null>(null);

  const preserveChangesModal =
    preserveModalPaletteId !== null ? (
      <EuiConfirmModal
        title={i18n.translate('coloring.colorMapping.colorChangesModal.title', {
          defaultMessage: 'Color changes detected',
        })}
        onCancel={() => {
          if (preserveModalPaletteId) switchPaletteFn(preserveModalPaletteId, true);
          setPreserveModalPaletteId(null);
        }}
        onConfirm={() => {
          if (preserveModalPaletteId) switchPaletteFn(preserveModalPaletteId, false);
          setPreserveModalPaletteId(null);
        }}
        confirmButtonText={i18n.translate('coloring.colorMapping.colorChangesModal.discardButton', {
          defaultMessage: 'Discard changes',
        })}
        cancelButtonText={i18n.translate('coloring.colorMapping.colorChangesModal.preserveButton', {
          defaultMessage: 'Preserve changes',
        })}
        buttonColor="danger"
        defaultFocusedButton="confirm"
      >
        <p>
          {i18n.translate('coloring.colorMapping.colorChangesModal.switchPaletteDescription', {
            defaultMessage: 'Switching palette will discard all your custom color changes',
          })}
        </p>
      </EuiConfirmModal>
    ) : null;

  const [colorScaleModalId, setColorScaleModalId] = useState<'gradient' | 'categorical' | null>(
    null
  );

  const colorScaleModal =
    colorScaleModalId !== null ? (
      <EuiConfirmModal
        title={i18n.translate('coloring.colorMapping.colorChangesModal.modalTitle', {
          defaultMessage: 'Color changes detected',
        })}
        onCancel={() => {
          setColorScaleModalId(null);
        }}
        onConfirm={() => {
          if (colorScaleModalId) updateColorMode(colorScaleModalId, false);
          setColorScaleModalId(null);
        }}
        cancelButtonText={i18n.translate(
          'coloring.colorMapping.colorChangesModal.goBackButtonLabel',
          {
            defaultMessage: 'Go back',
          }
        )}
        confirmButtonText={i18n.translate(
          'coloring.colorMapping.colorChangesModal.discardButtonLabel',
          {
            defaultMessage: 'Discard changes',
          }
        )}
        defaultFocusedButton="confirm"
        buttonColor="danger"
      >
        <p>
          {colorScaleModalId === 'categorical'
            ? i18n.translate('coloring.colorMapping.colorChangesModal.categoricalModeDescription', {
                defaultMessage: `Switching to a categorical mode will discard all your custom color changes`,
              })
            : i18n.translate('coloring.colorMapping.colorChangesModal.sequentialModeDescription', {
                defaultMessage: `Switching to a sequential mode will discard all your custom color changes`,
              })}
        </p>
      </EuiConfirmModal>
    ) : null;

  return (
    <>
      {preserveChangesModal}
      {colorScaleModal}
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('coloring.colorMapping.paletteSelector.paletteLabel', {
              defaultMessage: `Color palette`,
            })}
          >
            <EuiColorPalettePicker
              data-test-subj="kbnColoring_ColorMapping_PalettePicker"
              palettes={[...palettes.values()]
                .filter((d) => d.name !== 'Neutral')
                .map((palette) => ({
                  'data-test-subj': `kbnColoring_ColorMapping_Palette-${palette.id}`,
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
                  setPreserveModalPaletteId(selectedPaletteId);
                } else {
                  switchPaletteFn(selectedPaletteId, false);
                }
              }}
              valueOfSelected={model.paletteId}
              selectionDisplay={'palette'}
              compressed={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiFormRow
            label={i18n.translate('coloring.colorMapping.paletteSelector.scaleLabel', {
              defaultMessage: `Scale`,
            })}
          >
            <EuiButtonGroup
              legend="Scale"
              data-test-subj="lns_colorMapping_scaleSwitch"
              options={[
                {
                  id: `categorical`,
                  label: i18n.translate('coloring.colorMapping.paletteSelector.categoricalLabel', {
                    defaultMessage: `Categorical`,
                  }),
                  iconType: 'palette',
                },
                {
                  id: `gradient`,
                  label: i18n.translate('coloring.colorMapping.paletteSelector.sequentialLabel', {
                    defaultMessage: `Sequential`,
                  }),
                  iconType: 'gradient',
                },
              ]}
              isFullWidth
              buttonSize="compressed"
              idSelected={colorMode.type}
              onChange={(id) => {
                const hasChanges = model.assignments.some((a) => a.touched);
                const hasGradientChanges =
                  model.colorMode.type === 'gradient' &&
                  model.colorMode.steps.some((a) => a.touched);

                if (hasChanges || hasGradientChanges) {
                  setColorScaleModalId(id as 'gradient' | 'categorical');
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
