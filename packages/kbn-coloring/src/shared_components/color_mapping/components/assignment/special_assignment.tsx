/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import React from 'react';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palette';
import { ColorSwatch } from '../color_picker/color_swatch';
import { updateSpecialAssignmentColor } from '../../state/color_mapping';

export function SpecialAssignment({
  assignment,
  index,
  palette,
  getPaletteFn,
  isDarkMode,
}: {
  isDarkMode: boolean;
  index: number;
  assignment: ColorMapping.Config['specialAssignments'][number];
  palette: ColorMapping.CategoricalPalette;
  getPaletteFn: ReturnType<typeof getPalette>;
}) {
  const dispatch = useDispatch();
  const canPickColor = true;
  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={0}>
        <ColorSwatch
          forType="specialAssignment"
          canPickColor={canPickColor}
          colorMode={{ type: 'categorical' }}
          assignmentColor={assignment.color}
          getPaletteFn={getPaletteFn}
          index={index}
          palette={palette}
          total={index}
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
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText
          compressed
          fullWidth
          disabled={true}
          placeholder={'all others'}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
