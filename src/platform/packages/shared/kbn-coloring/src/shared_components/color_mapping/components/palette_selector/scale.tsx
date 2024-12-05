/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiButtonGroup, EuiConfirmModal, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RootState, updatePalette } from '../../state/color_mapping';
import { ColorMapping } from '../../config';
import { updateAssignmentsPalette } from '../../config/assignments';
import { getPalette } from '../../palettes';

export function ScaleMode({ getPaletteFn }: { getPaletteFn: ReturnType<typeof getPalette> }) {
  const dispatch = useDispatch();
  const colorMode = useSelector((state: RootState) => state.colorMapping.colorMode);
  const model = useSelector((state: RootState) => state.colorMapping);

  const { paletteId } = model;

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
        updatedColorMode,
        paletteId,
        getPaletteFn,
        preserveColorChanges
      );
      dispatch(updatePalette({ paletteId, assignments, colorMode: updatedColorMode }));
    },
    [getPaletteFn, model, dispatch, paletteId]
  );

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
                defaultMessage: `Switching to a gradient mode will discard all your custom color changes`,
              })}
        </p>
      </EuiConfirmModal>
    ) : null;

  return (
    <>
      {colorScaleModal}
      <EuiFormRow
        label={i18n.translate('coloring.colorMapping.paletteSelector.scaleLabel', {
          defaultMessage: `Mode`,
        })}
      >
        <EuiButtonGroup
          legend="Mode"
          buttonSize="compressed"
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
              label: i18n.translate('coloring.colorMapping.paletteSelector.gradientLabel', {
                defaultMessage: `Gradient`,
              }),
              iconType: 'gradient',
            },
          ]}
          isIconOnly
          idSelected={colorMode.type}
          onChange={(id) => {
            const hasChanges = model.assignments.some((a) => a.touched);
            const hasGradientChanges =
              model.colorMode.type === 'gradient' && model.colorMode.steps.some((a) => a.touched);

            if (hasChanges || hasGradientChanges) {
              setColorScaleModalId(id as 'gradient' | 'categorical');
            } else {
              updateColorMode(id as 'gradient' | 'categorical', false);
            }
          }}
        />
      </EuiFormRow>
    </>
  );
}
