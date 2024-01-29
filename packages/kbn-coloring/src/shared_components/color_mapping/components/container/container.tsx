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
  EuiPanel,
  EuiHorizontalRule,
  EuiEmptyPrompt,
  EuiButton,
  EuiText,
  EuiPopover,
  EuiContextMenuPanel,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
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
  const [showOtherActions, setShowOtherActions] = useState<boolean>(false);

  const getPaletteFn = getPalette(palettes, NeutralPalette);

  const palette = useSelector(selectPalette(getPaletteFn));
  const colorMode = useSelector(selectColorMode);
  const assignments = useSelector(selectComputedAssignments);
  const specialAssignments = useSelector(selectSpecialAssignments);

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
    <EuiFlexGroup direction="column" gutterSize="m" justifyContent="flexStart">
      <EuiFlexItem>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
        >
          <EuiFlexItem>
            <PaletteSelector
              palettes={palettes}
              getPaletteFn={getPaletteFn}
              isDarkMode={isDarkMode}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <ScaleMode getPaletteFn={getPaletteFn} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {colorMode.type === 'gradient' && (
        <EuiFlexItem style={{ position: 'relative' }}>
          <div
            css={css`
              position: absolute;
              right: 0;
            }`}
          >
            <EuiToolTip
              position="top"
              content={i18n.translate('coloring.colorMapping.container.invertGradientButtonLabel', {
                defaultMessage: 'Invert gradient',
              })}
            >
              <EuiButtonIcon
                data-test-subj="lns-colorMapping-invertGradient"
                iconType="merge"
                size="xs"
                aria-label={i18n.translate(
                  'coloring.colorMapping.container.invertGradientButtonLabel',
                  {
                    defaultMessage: 'Invert gradient',
                  }
                )}
                onClick={() => {
                  dispatch(changeGradientSortOrder(colorMode.sort === 'asc' ? 'desc' : 'asc'));
                }}
              />
            </EuiToolTip>
          </div>
          <EuiFormRow
            label={i18n.translate('coloring.colorMapping.container.gradientHeader', {
              defaultMessage: 'Gradient',
            })}
          >
            <Gradient
              colorMode={colorMode}
              getPaletteFn={getPaletteFn}
              isDarkMode={isDarkMode}
              paletteId={palette.id}
              assignmentsSize={assignments.length}
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate('coloring.colorMapping.container.mappingAssignmentHeader', {
                defaultMessage: 'Color assignments',
              })}
            </EuiFormLabel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel
          color="subdued"
          borderRadius="none"
          hasShadow={false}
          paddingSize="none"
          css={css`
            overflow: hidden;
          `}
        >
          <div
            css={css`
              padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingSmall};
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              {assignments.map((assignment, i) => {
                return (
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
                );
              })}
              {assignments.length === 0 && (
                <EuiEmptyPrompt
                  paddingSize="s"
                  body={
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="coloring.colorMapping.container.mapValuesPromptDescription.mapValuesPromptDetail"
                          defaultMessage="Add new assignments to begin associating terms in your data with specified colors."
                        />
                      </p>
                    </EuiText>
                  }
                  actions={[
                    <EuiButton
                      color="primary"
                      size="s"
                      onClick={onClickAddNewAssignment}
                      iconType="plus"
                    >
                      {i18n.translate('coloring.colorMapping.container.AddAssignmentButtonLabel', {
                        defaultMessage: 'Add assignment',
                      })}
                    </EuiButton>,
                    <EuiButtonEmpty
                      color="primary"
                      size="xs"
                      onClick={onClickAddAllCurrentCategories}
                    >
                      {i18n.translate('coloring.colorMapping.container.mapValueButtonLabel', {
                        defaultMessage: 'Add all unassigned terms',
                      })}
                    </EuiButtonEmpty>,
                  ]}
                />
              )}
            </EuiFlexGroup>
          </div>
          {assignments.length > 0 && <EuiHorizontalRule margin="none" />}
          <div
            css={css`
              padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingSmall};
              overflow: hidden;
            `}
          >
            {assignments.length > 0 && (
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="none"
              >
                <EuiButton color="text" size="s" onClick={onClickAddNewAssignment} iconType="plus">
                  {i18n.translate('coloring.colorMapping.container.AddAssignmentButtonLabel', {
                    defaultMessage: 'Add assignment',
                  })}
                </EuiButton>
                {data.type === 'categories' && (
                  <EuiPopover
                    id={'TODO popoverid'}
                    button={
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        onClick={() => setShowOtherActions(true)}
                      />
                    }
                    isOpen={showOtherActions}
                    closePopover={() => setShowOtherActions(false)}
                    panelPaddingSize="xs"
                    anchorPosition="downRight"
                    ownFocus
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          data-test-subj="lns-colorMapping-addAllAssignments"
                          key="item-1"
                          icon="listAdd"
                          size="s"
                          onClick={() => {
                            setShowOtherActions(false);
                            requestAnimationFrame(() => {
                              onClickAddAllCurrentCategories();
                            });
                          }}
                          disabled={unmatchingCategories.length === 0}
                        >
                          <EuiFlexGroup>
                            <EuiFlexItem>
                              {i18n.translate(
                                'coloring.colorMapping.container.mapCurrentValuesButtonLabel',
                                {
                                  defaultMessage: 'Add all unsassigned terms',
                                  values: {
                                    termsCount:
                                      unmatchingCategories.length > 0
                                        ? `(${unmatchingCategories.length})`
                                        : '',
                                  },
                                }
                              )}
                            </EuiFlexItem>
                            {unmatchingCategories.length > 0 && (
                              <EuiFlexItem grow={0}>
                                <EuiNotificationBadge color="subdued">
                                  {unmatchingCategories.length}
                                </EuiNotificationBadge>
                              </EuiFlexItem>
                            )}
                          </EuiFlexGroup>
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          data-test-subj="lns-colorMapping-clearAllAssignments"
                          size="s"
                          icon={<EuiIcon type="eraser" size="m" color="danger" />}
                          onClick={() => {
                            setShowOtherActions(false);
                            setAssignmentOnFocus(-1);
                            dispatch(removeAllAssignments());
                          }}
                          color="danger"
                        >
                          {i18n.translate(
                            'coloring.colorMapping.container.clearAllAssignmentsButtonLabel',
                            {
                              defaultMessage: 'Clear all assignments',
                              values: {
                                termsCount:
                                  unmatchingCategories.length > 0
                                    ? `(${unmatchingCategories.length})`
                                    : '',
                              },
                            }
                          )}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                )}
              </EuiFlexGroup>
            )}
          </div>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('coloring.colorMapping.container.fallbackModeHeader', {
            defaultMessage: 'Color for unassigned terms',
          })}
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
                          defaultMessage: 'Loop gradient',
                        }
                      )
                    : i18n.translate(
                        'coloring.colorMapping.container.fallbackMode.ReuseColorsLabel',
                        {
                          defaultMessage: 'Loop palette colors',
                        }
                      ),
              },
              {
                id: 'static',
                label: i18n.translate(
                  'coloring.colorMapping.container.fallbackMode.SingleColorLabel',
                  {
                    defaultMessage: 'Select Single color',
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
