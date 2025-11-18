/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { css } from '@emotion/react';
import type { KbnPalettes } from '@kbn/palettes';
import { KbnPalette } from '@kbn/palettes';
import { updateSpecialAssignmentColor } from '../../state/color_mapping';
import { DEFAULT_NEUTRAL_PALETTE_INDEX } from '../../config/default_color_mapping';
import { SpecialAssignment } from '../assignment/special_assignment';
import {
  selectColorMode,
  selectComputedAssignments,
  selectPalette,
  selectSpecialAssignments,
} from '../../state/selectors';
import type { ColorMappingInputData } from '../../categorical_color_mapping';
import { getOtherAssignmentColor } from '../../config/utils';

export function UnassignedTermsConfig({
  palettes,
  data,
  isDarkMode,
}: {
  palettes: KbnPalettes;
  data: ColorMappingInputData;
  isDarkMode: boolean;
}) {
  const dispatch = useDispatch();
  const neutralPalette = palettes.get(KbnPalette.Neutral);
  const palette = useSelector(selectPalette(palettes));
  const colorMode = useSelector(selectColorMode);
  const specialAssignments = useSelector(selectSpecialAssignments);
  const assignments = useSelector(selectComputedAssignments);
  const otherAssignmentColor = getOtherAssignmentColor(specialAssignments, assignments);

  const colorModes: EuiButtonGroupOptionProps[] = [
    {
      id: 'loop',
      label:
        colorMode.type === 'gradient'
          ? i18n.translate(
              'coloring.colorMapping.container.unassignedTermsMode.ReuseGradientLabel',
              {
                defaultMessage: 'Gradient',
              }
            )
          : i18n.translate('coloring.colorMapping.container.unassignedTermsMode.ReuseColorsLabel', {
              defaultMessage: 'Color palette',
            }),
    },
    {
      id: 'static',
      label: i18n.translate(
        'coloring.colorMapping.container.unassignedTermsMode.SingleColorLabel',
        {
          defaultMessage: 'Single color',
        }
      ),
    },
  ];

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('coloring.colorMapping.container.unassignedTermsModeHeader', {
        defaultMessage: 'Color for unassigned terms',
      })}
    >
      <EuiFlexGroup direction="row" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiButtonGroup
            legend={'Color mode'}
            options={colorModes}
            idSelected={otherAssignmentColor.isLoop ? 'loop' : 'static'}
            onChange={(optionId) => {
              dispatch(
                updateSpecialAssignmentColor({
                  assignmentIndex: 0,
                  color:
                    optionId === 'loop'
                      ? {
                          type: 'loop',
                        }
                      : {
                          type: 'categorical',
                          colorIndex: DEFAULT_NEUTRAL_PALETTE_INDEX,
                          paletteId: neutralPalette.id,
                        },
                })
              );
            }}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFlexItem>

        <EuiFlexItem grow={0}>
          <div
            css={css`
              visibility: ${otherAssignmentColor.isLoop ? 'hidden' : 'visible'};
              width: 32px;
              height: 32px;
            `}
          >
            {data.type === 'categories' && otherAssignmentColor.isLoop === false && (
              <SpecialAssignment
                index={0}
                palette={palette}
                isDarkMode={isDarkMode}
                palettes={palettes}
                assignmentColor={otherAssignmentColor.color}
                total={specialAssignments.length}
              />
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
