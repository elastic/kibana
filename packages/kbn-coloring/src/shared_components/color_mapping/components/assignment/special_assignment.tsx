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
import { i18n } from '@kbn/i18n';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { ColorSwatch } from '../color_picker/color_swatch';
import { updateSpecialAssignmentColor } from '../../state/color_mapping';

export function SpecialAssignment({
  assignment,
  index,
  palette,
  getPaletteFn,
  isDarkMode,
  total,
}: {
  isDarkMode: boolean;
  index: number;
  assignment: ColorMapping.Config['specialAssignments'][number];
  palette: ColorMapping.CategoricalPalette;
  getPaletteFn: ReturnType<typeof getPalette>;
  total: number;
}) {
  const dispatch = useDispatch();
  const canPickColor = true;
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={0}>
        <ColorSwatch
          forType="specialAssignment"
          canPickColor={canPickColor}
          colorMode={{ type: 'categorical' }}
          assignmentColor={assignment.color}
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
      </EuiFlexItem>
      <EuiFlexItem
        style={{
          marginRight: 32,
        }}
      >
        <EuiFieldText
          compressed
          fullWidth
          disabled={true}
          placeholder={i18n.translate('coloring.colorMapping.assignments.unassignedPlaceholder', {
            defaultMessage: 'Unassigned terms',
          })}
          aria-label={i18n.translate('coloring.colorMapping.assignments.unassignedAriaLabel', {
            defaultMessage:
              'Assign this color to every unassigned not described in the assignment list',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
