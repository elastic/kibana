/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiColorPalettePicker, EuiConfirmModal, EuiFormRow } from '@elastic/eui';
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
  const model = useSelector((state: RootState) => state.colorMapping);

  const switchPaletteFn = useCallback(
    (selectedPaletteId: string, preserveColorChanges: boolean) => {
      dispatch(
        updatePalette({
          paletteId: selectedPaletteId,
          assignments: updateAssignmentsPalette(
            model.assignments,
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

  return (
    <>
      {preserveChangesModal}
      <EuiFormRow
        fullWidth
        label={i18n.translate('coloring.colorMapping.paletteSelector.paletteLabel', {
          defaultMessage: `Color palette`,
        })}
      >
        <EuiColorPalettePicker
          data-test-subj="kbnColoring_ColorMapping_PalettePicker"
          fullWidth
          palettes={[...palettes.values()]
            .filter((d) => d.name !== 'Neutral')
            .map((palette) => ({
              'data-test-subj': `kbnColoring_ColorMapping_Palette-${palette.id}`,
              value: palette.id,
              title: palette.name,
              palette: Array.from({ length: palette.colorCount }, (_, i) => {
                return palette.getColor(i, isDarkMode, false);
              }),
              type: 'fixed',
            }))}
          onChange={(selectedPaletteId) => {
            const hasChanges = model.assignments.some((a) => a.touched);
            const hasGradientChanges =
              model.colorMode.type === 'gradient' && model.colorMode.steps.some((a) => a.touched);
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
    </>
  );
}
