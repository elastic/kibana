/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
  EuiHorizontalRule,
  EuiEmptyPrompt,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { css } from '@emotion/react';
import { Assignment } from '../assignment/assignment';
import { SpecialAssignment } from '../assignment/special_assignment';
import { PaletteSelector } from '../palette_selector/palette_selector';

import {
  RootState,
  addNewAssignment,
  changeGradientSortOrder,
  updateSpecialAssignmentColor,
  addNewAssignments,
  removeAllAssignments,
} from '../../state/color_mapping';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { selectColorMode, selectPalette, selectSpecialAssignments } from '../../state/selectors';
import { ColorMappingInputData } from '../../categorical_color_mapping';
import { Gradient } from '../palette_selector/gradient';
import { NeutralPalette } from '../../palettes/neutral';
import { DEFAULT_NEUTRAL_PALETTE_INDEX } from '../../config/default_color_mapping';
import { ruleMatch } from '../../color/rule_matching';
import { ScaleMode } from '../palette_selector/scale';

export const MAX_ASSIGNABLE_COLORS = Infinity;

const selectComputedAssignments = (state: RootState) => state.colorMapping.assignments;

export function Container({
  data,
  palettes,
  isDarkMode,
  specialTokens,
}: {
  palettes: Map<string, ColorMapping.CategoricalPalette>;
  data: ColorMappingInputData;
  isDarkMode: boolean;
  /** map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket */
  specialTokens: Map<string, string>;
}) {
  const dispatch = useDispatch();
  const [assignmentOnFocus, setAssignmentOnFocus] = useState<number>(-1);

  const getPaletteFn = getPalette(palettes, NeutralPalette);

  const palette = useSelector(selectPalette(getPaletteFn));
  const colorMode = useSelector(selectColorMode);
  const assignments = useSelector(selectComputedAssignments);
  const specialAssignments = useSelector(selectSpecialAssignments);

  const canAddNewAssignment = assignments.length < MAX_ASSIGNABLE_COLORS;

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

  const unmatchingCategories =
    data.type === 'categories'
      ? data.categories.filter((category) => {
          return !assignments.some(({ rule }) => ruleMatch(rule, category));
        })
      : [];

  const onClickAddNewAssignment = () => {
    setAssignmentOnFocus(assignments.length);
    dispatch(
      addNewAssignment({
        rule:
          data.type === 'categories'
            ? {
                type: 'matchExactly',
                values: [],
              }
            : { type: 'range', min: 0, max: 0, minInclusive: true, maxInclusive: true },
        color:
          colorMode.type === 'categorical'
            ? {
                type: 'categorical',
                paletteId: palette.id,
                colorIndex: assignments.length % palette.colorCount,
              }
            : { type: 'gradient' },
        touched: false,
      })
    );
  };
  const onClickAddAllCurrentCategories = () => {
    setAssignmentOnFocus(-1);
    if (data.type === 'categories') {
      const newAssignments: ColorMapping.Config['assignments'] = unmatchingCategories.map(
        (c, i) => {
          return {
            rule: {
              type: 'matchExactly',
              values: [c],
            },
            color:
              colorMode.type === 'categorical'
                ? {
                    type: 'categorical',
                    paletteId: palette.id,
                    colorIndex: (assignments.length + i) % palette.colorCount,
                  }
                : { type: 'gradient' },
            touched: false,
          };
        }
      );
      dispatch(addNewAssignments(newAssignments));
    }
  };

  const otherAssignment = specialAssignments[0];

  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem>
        <PaletteSelector palettes={palettes} getPaletteFn={getPaletteFn} isDarkMode={isDarkMode} />
      </EuiFlexItem>
      <EuiFlexItem>
        <ScaleMode getPaletteFn={getPaletteFn} />
      </EuiFlexItem>
      {colorMode.type === 'gradient' && (
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('coloring.colorMapping.container.gradientHeader', {
              defaultMessage: 'Gradient',
            })}
          >
            <div>
              <Gradient
                colorMode={colorMode}
                getPaletteFn={getPaletteFn}
                isDarkMode={isDarkMode}
                paletteId={palette.id}
                assignmentsSize={assignments.length}
              />
              <EuiSpacer size="xs" />
              <EuiFlexGroup justifyContent="flexEnd" direction="row">
                <EuiButtonEmpty
                  flush="both"
                  data-test-subj="lns-colorMapping-invertGradient"
                  iconType="merge"
                  size="xs"
                  onClick={() => {
                    dispatch(changeGradientSortOrder(colorMode.sort === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  {i18n.translate('coloring.colorMapping.container.invertGradientButtonLabel', {
                    defaultMessage: 'Invert gradient',
                  })}
                </EuiButtonEmpty>
              </EuiFlexGroup>
            </div>
          </EuiFormRow>
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate('coloring.colorMapping.container.mappingAssignmentHeader', {
                defaultMessage: 'Mappings',
              })}
            </EuiFormLabel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false} paddingSize="s">
          {assignments.length > 0 && (
            <>
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="none"
              >
                <EuiButtonEmpty
                  data-test-subj="lns-colorMapping-addNewAssignment"
                  size="xs"
                  flush="both"
                  onClick={onClickAddNewAssignment}
                  disabled={!canAddNewAssignment}
                  css={css`
                    margin-right: 8px;
                  `}
                >
                  {i18n.translate('coloring.colorMapping.container.mapValueButtonLabel', {
                    defaultMessage: 'Map a value',
                  })}
                </EuiButtonEmpty>

                {data.type === 'categories' && (
                  <EuiButtonEmpty
                    data-test-subj="lns-colorMapping-addNewAssignment"
                    size="xs"
                    flush="both"
                    onClick={onClickAddAllCurrentCategories}
                    disabled={unmatchingCategories.length === 0}
                    css={css`
                      margin-right: 8px;
                    `}
                  >
                    {i18n.translate('coloring.colorMapping.container.mapCurrentValuesButtonLabel', {
                      defaultMessage: 'Map current values {termsCount}',
                      values: {
                        termsCount:
                          unmatchingCategories.length > 0 ? `(${unmatchingCategories.length})` : '',
                      },
                    })}
                  </EuiButtonEmpty>
                )}

                <EuiButtonEmpty
                  data-test-subj="lns-colorMapping-addNewAssignment"
                  size="xs"
                  flush="both"
                  color="danger"
                  onClick={() => {
                    setAssignmentOnFocus(-1);
                    dispatch(removeAllAssignments());
                  }}
                  disabled={assignments.length === 0}
                  css={css`
                    margin-right: 8px;
                  `}
                >
                  {i18n.translate('coloring.colorMapping.container.resetButtonLabel', {
                    defaultMessage: 'Reset',
                  })}
                </EuiButtonEmpty>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
            </>
          )}

          <EuiFlexGroup direction="column">
            <div
              data-test-subj="lns-colorMapping-assignmentsList"
              css={css`
                display: grid;
                grid-template-columns: [assignment] auto;
                gap: 8px;
              `}
            >
              {assignments.map((assignment, i) => {
                return (
                  <div
                    key={i}
                    css={css`
                      position: relative;
                      grid-column: 1;
                      grid-row: ${i + 1};
                      width: 100%;
                    `}
                  >
                    <Assignment
                      data={data}
                      index={i}
                      total={assignments.length}
                      colorMode={colorMode}
                      editable={true}
                      canPickColor={true}
                      palette={palette}
                      isDarkMode={isDarkMode}
                      getPaletteFn={getPaletteFn}
                      assignment={assignment}
                      disableDelete={false}
                      specialTokens={specialTokens}
                      assignmentValuesCounter={assignmentValuesCounter}
                      focusOnMount={assignmentOnFocus === i}
                      onBlur={() => setAssignmentOnFocus(-1)}
                    />
                  </div>
                );
              })}
              {assignments.length === 0 && (
                <EuiEmptyPrompt
                  paddingSize="none"
                  body={
                    <p style={{ fontSize: '0.8em' }}>
                      <FormattedMessage
                        id="coloring.colorMapping.container.mapValuesPromptDescription.mapValuesPromptDetail"
                        defaultMessage="Map values to colors to {strongPersist} the associations across data changes."
                        values={{
                          verb: (
                            <strong>
                              <FormattedMessage
                                id="coloring.colorMapping.container.mapValuesPromptDescription.strongPersistLabel"
                                defaultMessage="persist"
                              />
                            </strong>
                          ),
                        }}
                      />
                    </p>
                  }
                  actions={[
                    <EuiButton
                      color="primary"
                      fill
                      size="s"
                      onClick={onClickAddAllCurrentCategories}
                    >
                      {i18n.translate(
                        'coloring.colorMapping.container.mapCurrentValuesButtonLabel',
                        {
                          defaultMessage: 'Map current values {termsCount}',
                          values: {
                            termsCount:
                              unmatchingCategories.length > 0
                                ? `(${unmatchingCategories.length})`
                                : '',
                          },
                        }
                      )}
                    </EuiButton>,
                    <EuiButtonEmpty color="primary" size="s" onClick={onClickAddNewAssignment}>
                      {i18n.translate('coloring.colorMapping.container.mapValueButtonLabel', {
                        defaultMessage: 'Map a value',
                      })}
                    </EuiButtonEmpty>,
                  ]}
                />
              )}
            </div>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={
            <EuiToolTip content="How color are applied to not mapped values">
              <span>
                {i18n.translate('coloring.colorMapping.container.fallbackModeHeader', {
                  defaultMessage: 'Fallback mode',
                })}
                <EuiIcon type="questionInCircle" color="subdued" />
              </span>
            </EuiToolTip>
          }
        >
          <EuiButtonGroup
            legend={'color mode'}
            options={[
              {
                id: 'loop',
                label:
                  colorMode.type === 'gradient'
                    ? i18n.translate(
                        'coloring.colorMapping.container.fallbackMode.ReuseGradientLabel',
                        {
                          defaultMessage: 'Reuse gradient',
                        }
                      )
                    : i18n.translate(
                        'coloring.colorMapping.container.fallbackMode.ReuseColorsLabel',
                        {
                          defaultMessage: 'Reuse colors',
                        }
                      ),
              },
              {
                id: 'static',
                label: i18n.translate(
                  'coloring.colorMapping.container.fallbackMode.SingleColorLabel',
                  {
                    defaultMessage: 'Single color',
                  }
                ),
              },
            ]}
            idSelected={specialAssignments[0].color.type === 'loop' ? 'loop' : 'static'}
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
                          paletteId: NeutralPalette.id,
                        },
                })
              );
            }}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFormRow>
      </EuiFlexItem>
      {data.type === 'categories' && otherAssignment.color.type !== 'loop' && (
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'coloring.colorMapping.container.fallbackMode.SingleColorHeader',
              {
                defaultMessage: 'Single color',
              }
            )}
            display="columnCompressed"
          >
            <SpecialAssignment
              index={0}
              palette={palette}
              isDarkMode={isDarkMode}
              getPaletteFn={getPaletteFn}
              assignmentColor={otherAssignment.color}
              total={specialAssignments.length}
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
