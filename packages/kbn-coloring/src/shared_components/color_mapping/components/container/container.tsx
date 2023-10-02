/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiPanel,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { Assignment } from '../assignment/assignment';
import { SpecialAssignment } from '../assignment/special_assignment';
import { PaletteSelector } from '../palette_selector/palette_selector';

import {
  RootState,
  addNewAssignment,
  assignAutomatically,
  assignStatically,
  changeGradientSortOrder,
} from '../../state/color_mapping';
import { generateAutoAssignmentsForCategories } from '../../config/assignment_from_categories';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { getUnusedColorForNewAssignment } from '../../config/assignments';
import {
  selectColorMode,
  selectPalette,
  selectSpecialAssignments,
  selectIsAutoAssignmentMode,
} from '../../state/selectors';
import { ColorMappingInputData } from '../../categorical_color_mapping';
import { Gradient } from '../palette_selector/gradient';
import { NeutralPalette } from '../../palettes/neutral';

export const MAX_ASSIGNABLE_COLORS = 10;

function selectComputedAssignments(
  data: ColorMappingInputData,
  palette: ColorMapping.CategoricalPalette,
  colorMode: ColorMapping.Config['colorMode']
) {
  return (state: RootState) =>
    state.colorMapping.assignmentMode === 'auto'
      ? generateAutoAssignmentsForCategories(data, palette, colorMode)
      : state.colorMapping.assignments;
}
export function Container(props: {
  palettes: Map<string, ColorMapping.CategoricalPalette>;
  data: ColorMappingInputData;
  isDarkMode: boolean;
  /** map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket */
  specialTokens: Map<string, string>;
}) {
  const dispatch = useDispatch();

  const getPaletteFn = getPalette(props.palettes, NeutralPalette);

  const palette = useSelector(selectPalette(getPaletteFn));
  const colorMode = useSelector(selectColorMode);
  const autoAssignmentMode = useSelector(selectIsAutoAssignmentMode);
  const assignments = useSelector(selectComputedAssignments(props.data, palette, colorMode));
  const specialAssignments = useSelector(selectSpecialAssignments);

  const canAddNewAssignment = !autoAssignmentMode && assignments.length < MAX_ASSIGNABLE_COLORS;

  const assignmentValuesCounter = assignments.reduce<Map<string | string[], number>>(
    (acc, assignment) => {
      const values = assignment.rule.type === 'matchExactly' ? assignment.rule.values : [];
      values.forEach((value) => {
        acc.set(value, (acc.get(value) ?? 0) + 1);
      });
      return acc;
    },
    new Map()
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem>
        <PaletteSelector
          palettes={props.palettes}
          getPaletteFn={getPaletteFn}
          isDarkMode={props.isDarkMode}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate('coloring.colorMapping.container.mappingAssignmentHeader', {
                defaultMessage: 'Mapping assignments',
              })}
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiSwitch
              data-test-subj="lns-colorMapping-autoAssignSwitch"
              label={
                <EuiText size="xs">
                  {i18n.translate('coloring.colorMapping.container.autoAssignLabel', {
                    defaultMessage: 'Auto assign',
                  })}
                </EuiText>
              }
              checked={autoAssignmentMode}
              compressed
              onChange={() => {
                if (autoAssignmentMode) {
                  dispatch(assignStatically(assignments));
                } else {
                  dispatch(assignAutomatically());
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false} paddingSize="s">
          <div
            data-test-subj="lns-colorMapping-assignmentsList"
            css={css`
              display: grid;
              grid-template-columns: ${colorMode.type === 'gradient' ? '[gradient] 16px' : ''} [assignment] auto;
              gap: 8px;
            `}
          >
            {colorMode.type !== 'gradient' ? null : (
              <Gradient
                colorMode={colorMode}
                getPaletteFn={getPaletteFn}
                isDarkMode={props.isDarkMode}
                paletteId={palette.id}
                assignmentsSize={assignments.length}
              />
            )}
            {assignments.map((assignment, i) => {
              return (
                <div
                  key={i}
                  css={css`
                    position: relative;
                    grid-column: ${colorMode.type === 'gradient' ? 2 : 1};
                    grid-row: ${i + 1};
                    width: 100%;
                  `}
                >
                  <Assignment
                    data={props.data}
                    index={i}
                    total={assignments.length}
                    colorMode={colorMode}
                    editable={!autoAssignmentMode}
                    canPickColor={!autoAssignmentMode && colorMode.type !== 'gradient'}
                    palette={palette}
                    isDarkMode={props.isDarkMode}
                    getPaletteFn={getPaletteFn}
                    assignment={assignment}
                    disableDelete={assignments.length <= 1 || autoAssignmentMode}
                    specialTokens={props.specialTokens}
                    assignmentValuesCounter={assignmentValuesCounter}
                  />
                </div>
              );
            })}
          </div>

          <EuiHorizontalRule margin="xs" />
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem data-test-subj="lns-colorMapping-specialAssignmentsList">
              {props.data.type === 'categories' &&
                specialAssignments.map((assignment, i) => {
                  return (
                    <SpecialAssignment
                      key={i}
                      index={i}
                      palette={palette}
                      isDarkMode={props.isDarkMode}
                      getPaletteFn={getPaletteFn}
                      assignment={assignment}
                      total={specialAssignments.length}
                    />
                  );
                })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiFlexGroup direction="row">
          <EuiFlexItem style={{ display: 'block' }}>
            <EuiButtonEmpty
              data-test-subj="lns-colorMapping-addNewAssignment"
              iconType="plusInCircleFilled"
              size="xs"
              flush="both"
              onClick={() => {
                dispatch(
                  addNewAssignment({
                    rule:
                      props.data.type === 'categories'
                        ? {
                            type: 'matchExactly',
                            values: [],
                          }
                        : { type: 'range', min: 0, max: 0, minInclusive: true, maxInclusive: true },
                    color: getUnusedColorForNewAssignment(palette, colorMode, assignments),
                    touched: false,
                  })
                );
              }}
              disabled={!canAddNewAssignment}
              css={css`
                margin-right: 8px;
              `}
            >
              {i18n.translate('coloring.colorMapping.container.addAssignmentButtonLabel', {
                defaultMessage: 'Add assignment',
              })}
            </EuiButtonEmpty>
            {colorMode.type === 'gradient' && (
              <EuiButtonEmpty
                flush="both"
                data-test-subj="lns-colorMapping-invertGradient"
                iconType="sortable"
                size="xs"
                onClick={() => {
                  dispatch(changeGradientSortOrder(colorMode.sort === 'asc' ? 'desc' : 'asc'));
                }}
              >
                {i18n.translate('coloring.colorMapping.container.invertGradientButtonLabel', {
                  defaultMessage: 'Invert gradient',
                })}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
