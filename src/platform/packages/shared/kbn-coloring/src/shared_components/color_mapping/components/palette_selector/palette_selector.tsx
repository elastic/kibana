/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiColorPalettePicker, EuiConfirmModal, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KbnPalettes, getAppendedTag } from '@kbn/palettes';
import { RootState, updatePalette } from '../../state/color_mapping';
import { updateAssignmentsPalette, updateColorModePalette } from '../../config/assignments';

export function PaletteSelector({ palettes }: { palettes: KbnPalettes }) {
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
            palettes,
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
    [dispatch, model.assignments, model.colorMode, palettes]
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

  const currentPaletteId = useMemo(
    () => palettes.get(model.paletteId).id, // need to resolve aliased id
    [model.paletteId, palettes]
  );

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
          palettes={palettes
            .getAll()
            .filter((d) => d.type === 'categorical')
            .map((palette) => ({
              'data-test-subj': `kbnColoring_ColorMapping_Palette-${palette.id}`,
              value: palette.id,
              title: palette.name,
              append: getAppendedTag(palette.tag),
              palette: Array.from({ length: palette.colorCount }, (_, i) => {
                return palette.getColor(i);
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
          valueOfSelected={currentPaletteId}
          selectionDisplay={'palette'}
          compressed={true}
        />
      </EuiFormRow>
    </>
  );
}
