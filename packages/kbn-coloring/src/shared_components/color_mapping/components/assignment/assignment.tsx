/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  removeAssignment,
  updateAssignmentColor,
  updateAssignmentRule,
} from '../../state/color_mapping';
import { ColorMapping } from '../../config';
import { Range } from './range';
import { Match } from './match';
import { getPalette } from '../../palettes';

import { ColorMappingInputData } from '../../categorical_color_mapping';
import { ColorSwatch } from '../color_picker/color_swatch';

export function Assignment({
  data,
  assignment,
  disableDelete,
  index,
  total,
  canPickColor,
  editable,
  palette,
  colorMode,
  getPaletteFn,
  isDarkMode,
  specialTokens,
}: {
  data: ColorMappingInputData;
  index: number;
  total: number;
  colorMode: ColorMapping.Config['colorMode'];
  assignment: ColorMapping.Config['assignments'][number];
  disableDelete: boolean;
  palette: ColorMapping.CategoricalPalette;
  getPaletteFn: ReturnType<typeof getPalette>;
  canPickColor: boolean;
  editable: boolean;
  isDarkMode: boolean;
  specialTokens: Map<string, string>;
}) {
  const dispatch = useDispatch();

  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={0}>
        <ColorSwatch
          forType="assignment"
          isDarkMode={isDarkMode}
          swatchShape="square"
          canPickColor={canPickColor}
          colorMode={colorMode}
          assignmentColor={assignment.color}
          getPaletteFn={getPaletteFn}
          index={index}
          palette={palette}
          total={total}
          onColorChange={(color) => {
            dispatch(updateAssignmentColor({ assignmentIndex: index, color }));
          }}
        />
      </EuiFlexItem>

      {assignment.rule.type === 'auto' ||
      assignment.rule.type === 'matchExactly' ||
      assignment.rule.type === 'matchExactlyCI' ? (
        <Match
          editable={editable}
          index={index}
          rule={assignment.rule}
          options={data.type === 'categories' ? data.categories : []}
          specialTokens={specialTokens}
          updateValue={(values: Array<string | string[]>) => {
            dispatch(
              updateAssignmentRule({
                assignmentIndex: index,
                rule: values.length === 0 ? { type: 'auto' } : { type: 'matchExactly', values },
              })
            );
          }}
        />
      ) : assignment.rule.type === 'range' ? (
        <Range
          rule={assignment.rule}
          editable={editable}
          updateValue={(min, max, minInclusive, maxInclusive) => {
            const rule: ColorMapping.RuleRange = {
              type: 'range',
              min,
              max,
              minInclusive,
              maxInclusive,
            };
            dispatch(updateAssignmentRule({ assignmentIndex: index, rule }));
          }}
        />
      ) : null}

      <EuiFlexItem grow={0}>
        <EuiButtonIcon
          iconType="trash"
          size="xs"
          disabled={disableDelete}
          onClick={() => dispatch(removeAssignment(index))}
          aria-label={i18n.translate(
            'coloring.colorMapping.assignments.deleteAssignmentButtonLabel',
            {
              defaultMessage: 'Delete this assignment',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
