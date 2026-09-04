/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux-v7';
import { css } from '@emotion/react';
import type { KbnPalettes } from '@kbn/palettes';
import { KbnPalette } from '@kbn/palettes';
import {
  addSpecialAssignment,
  removeSpecialAssignment,
  updateSpecialAssignmentColor,
} from '../../state/color_mapping';
import {
  DEFAULT_NEUTRAL_PALETTE_INDEX,
  DEFAULT_OTHERS_BUCKET_ASSIGNMENT,
} from '../../config/default_color_mapping';
import { SpecialAssignment } from '../assignment/special_assignment';
import { selectPalette, selectSpecialAssignments } from '../../state/selectors';
import { getOtherBucketAssignment } from '../../config/utils';
import type { CategoricalColor } from '../../config/types';

const colorModes: EuiButtonGroupOptionProps[] = [
  {
    id: 'none',
    label: i18n.translate('coloring.colorMapping.container.otherTermMode.NoneLabel', {
      defaultMessage: 'Auto',
    }),
    'data-test-subj': 'lns-colorMapping-otherBucketMode-none',
  },
  {
    id: 'neutral',
    label: i18n.translate('coloring.colorMapping.container.otherTermMode.NeutralLabel', {
      defaultMessage: 'Neutral',
    }),
    toolTipContent: i18n.translate('coloring.colorMapping.container.otherTermMode.NeutralTooltip', {
      defaultMessage: 'A theme-aware neutral color',
    }),
    'data-test-subj': 'lns-colorMapping-otherBucketMode-neutral',
  },
  {
    id: 'static',
    label: i18n.translate('coloring.colorMapping.container.otherTermMode.Color', {
      defaultMessage: 'Color',
    }),
    'data-test-subj': 'lns-colorMapping-otherBucketMode-static',
  },
];

export function OtherTermConfig({
  palettes,
  isDarkMode,
}: {
  palettes: KbnPalettes;
  isDarkMode: boolean;
}) {
  const dispatch = useDispatch();
  const palette = useSelector(selectPalette(palettes));
  const specialAssignments = useSelector(selectSpecialAssignments);
  const otherBucketAssignment = getOtherBucketAssignment(specialAssignments)?.assignment;

  const selectedColorMode = useMemo(() => {
    if (!otherBucketAssignment) {
      return 'none';
    }

    if (otherBucketAssignment.color.type === 'theme') {
      return 'neutral';
    }

    return 'static';
  }, [otherBucketAssignment]);

  const onChange = useCallback(
    (optionId: string) => {
      if (optionId === 'none') {
        dispatch(removeSpecialAssignment({ rule: 'others_bucket' }));
        return;
      }

      const neutralPalette = palettes.get(KbnPalette.Neutral);
      const color =
        optionId === 'neutral'
          ? DEFAULT_OTHERS_BUCKET_ASSIGNMENT.color
          : ({
              type: 'categorical',
              colorIndex: DEFAULT_NEUTRAL_PALETTE_INDEX,
              paletteId: neutralPalette.id,
            } satisfies CategoricalColor);

      if (selectedColorMode === 'none') {
        dispatch(addSpecialAssignment({ rule: 'others_bucket', color }));
      } else {
        dispatch(updateSpecialAssignmentColor({ rule: 'others_bucket', color }));
      }
    },
    [dispatch, palettes, selectedColorMode]
  );

  return (
    <EuiFormRow
      fullWidth
      data-test-subj="lns-colorMapping-otherBucketConfig"
      label={i18n.translate('coloring.colorMapping.container.otherTermHeader', {
        defaultMessage: 'Color for "Other" aggregation',
      })}
    >
      <EuiFlexGroup direction="row" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiButtonGroup
            legend={'"Other" color'}
            options={colorModes}
            idSelected={selectedColorMode}
            onChange={onChange}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFlexItem>

        <EuiFlexItem grow={0}>
          <div
            css={css`
              visibility: ${selectedColorMode === 'static' ? 'visible' : 'hidden'};
              width: 32px;
              height: 32px;
            `}
          >
            {otherBucketAssignment && otherBucketAssignment.color.type !== 'theme' && (
              <SpecialAssignment
                type="others_bucket"
                index={0}
                palette={palette}
                isDarkMode={isDarkMode}
                palettes={palettes}
                assignmentColor={otherBucketAssignment.color}
                total={1}
              />
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
