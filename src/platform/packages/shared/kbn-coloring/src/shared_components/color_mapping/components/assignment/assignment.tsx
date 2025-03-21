/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import {
  removeAssignment,
  updateAssignmentColor,
  updateAssignmentRules,
} from '../../state/color_mapping';
import { ColorMapping } from '../../config';
import { Range } from './range';
import { Match } from './match';

import { ColorMappingInputData } from '../../categorical_color_mapping';
import { ColorSwatch } from '../color_picker/color_swatch';
import { ColorAssignmentMatcher } from '../../color/color_assignment_matcher';

export function Assignment({
  data,
  assignment,
  assignments,
  disableDelete,
  index,
  palette,
  palettes,
  colorMode,
  isDarkMode,
  specialTokens,
  formatter,
  allowCustomMatch,
  assignmentMatcher,
}: {
  data: ColorMappingInputData;
  index: number;
  colorMode: ColorMapping.Config['colorMode'];
  assignment: ColorMapping.Assignment;
  assignments: ColorMapping.Assignment[];
  disableDelete: boolean;
  palette: IKbnPalette;
  palettes: KbnPalettes;
  isDarkMode: boolean;
  specialTokens: Map<string, string>;
  formatter?: IFieldFormat;
  allowCustomMatch?: boolean;
  assignmentMatcher: ColorAssignmentMatcher;
}) {
  const dispatch = useDispatch();

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={0}>
        <ColorSwatch
          forType="assignment"
          isDarkMode={isDarkMode}
          swatchShape="square"
          colorMode={colorMode}
          assignmentColor={assignment.color}
          index={index}
          palette={palette}
          palettes={palettes}
          total={assignments.length}
          onColorChange={(color) => {
            dispatch(
              updateAssignmentColor({
                assignmentIndex: index,
                color,
              })
            );
          }}
        />
      </EuiFlexItem>

      {assignment.rules[0]?.type === 'range' ? (
        <Range
          rule={assignment.rules[0]}
          updateValue={(min, max, minInclusive, maxInclusive) => {
            const rule: ColorMapping.RuleRange = {
              type: 'range',
              min,
              max,
              minInclusive,
              maxInclusive,
            };
            dispatch(
              updateAssignmentRules({
                assignmentIndex: index,
                rules: [rule],
              })
            );
          }}
        />
      ) : (
        <Match
          index={index}
          rules={assignment.rules}
          categories={data.type === 'categories' ? data.categories : []}
          specialTokens={specialTokens}
          formatter={formatter}
          allowCustomMatch={allowCustomMatch}
          assignmentMatcher={assignmentMatcher}
          updateRules={(rules) => {
            dispatch(
              updateAssignmentRules({
                assignmentIndex: index,
                rules,
              })
            );
          }}
        />
      )}

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
          color="danger"
          css={
            !disableDelete
              ? css`
                  color: ${euiThemeVars.euiTextColor};
                  transition: ${euiThemeVars.euiAnimSpeedFast} ease-in-out;
                  transition-property: color;
                  &:hover,
                  &:focus {
                    color: ${euiThemeVars.euiColorDangerText};
                  }
                `
              : undefined
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
