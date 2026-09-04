/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useDispatch } from 'react-redux-v7';
import React from 'react';
import type { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import { ColorSwatch } from '../color_picker/color_swatch';
import { updateSpecialAssignmentColor } from '../../state/color_mapping';
import type { ColorCode, CategoricalColor } from '../../config/types';
import type { ColorMapping } from '../../config';

export function SpecialAssignment({
  assignmentColor,
  index,
  palette,
  palettes,
  isDarkMode,
  total,
  type,
}: {
  isDarkMode: boolean;
  index: number;
  assignmentColor: CategoricalColor | ColorCode;
  palette: IKbnPalette;
  palettes: KbnPalettes;
  total: number;
  type: ColorMapping.Config['specialAssignments'][number]['rules'][number]['type'];
}) {
  const dispatch = useDispatch();
  return (
    <ColorSwatch
      forType="specialAssignment"
      colorMode={{ type: 'categorical' }}
      assignmentColor={assignmentColor}
      palettes={palettes}
      index={index}
      palette={palette}
      total={total}
      swatchShape="square"
      isDarkMode={isDarkMode}
      onColorChange={(color) => {
        dispatch(
          updateSpecialAssignmentColor({
            rule: type,
            color,
          })
        );
      }}
    />
  );
}
