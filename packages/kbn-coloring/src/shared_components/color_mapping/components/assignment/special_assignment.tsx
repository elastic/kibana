/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useDispatch } from 'react-redux';
import React from 'react';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { ColorSwatch } from '../color_picker/color_swatch';
import { updateSpecialAssignmentColor } from '../../state/color_mapping';
import { ColorCode, CategoricalColor } from '../../config/types';

export function SpecialAssignment({
  assignmentColor,
  index,
  palette,
  getPaletteFn,
  isDarkMode,
  total,
}: {
  isDarkMode: boolean;
  index: number;
  assignmentColor: CategoricalColor | ColorCode;
  palette: ColorMapping.CategoricalPalette;
  getPaletteFn: ReturnType<typeof getPalette>;
  total: number;
}) {
  const dispatch = useDispatch();
  return (
    <ColorSwatch
      forType="specialAssignment"
      colorMode={{ type: 'categorical' }}
      assignmentColor={assignmentColor}
      getPaletteFn={getPaletteFn}
      index={index}
      palette={palette}
      total={total}
      swatchShape="square"
      isDarkMode={isDarkMode}
      onColorChange={(color) => {
        dispatch(
          updateSpecialAssignmentColor({
            assignmentIndex: index,
            color,
          })
        );
      }}
    />
  );
}
