/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { findLast } from 'lodash';
import { Assignment } from '../assignment/assignment';
import {
  addNewAssignment,
  addNewAssignments,
  removeAllAssignments,
} from '../../state/color_mapping';
import { selectColorMode, selectComputedAssignments, selectPalette } from '../../state/selectors';
import { ColorMappingInputData } from '../../categorical_color_mapping';
import { ColorMapping } from '../../config';
import { getPalette, NeutralPalette } from '../../palettes';
import { ruleMatch } from '../../color/rule_matching';

export function AssignmentsConfig({
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
  const [showOtherActions, setShowOtherActions] = useState<boolean>(false);

  const dispatch = useDispatch();
  const getPaletteFn = getPalette(palettes, NeutralPalette);
  const palette = useSelector(selectPalette(getPaletteFn));
  const colorMode = useSelector(selectColorMode);
  const assignments = useSelector(selectComputedAssignments);

  const unmatchingCategories = useMemo(() => {
    return data.type === 'categories'
      ? data.categories.filter((category) => {
          return !assignments.some(({ rule }) => ruleMatch(rule, category));
        })
      : [];
  }, [data, assignments]);

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

  const onClickAddNewAssignment = useCallback(() => {
    const lastCategorical = findLast(assignments, (d) => {
      return d.color.type === 'categorical';
    });
    const nextCategoricalIndex =
      lastCategorical?.color.type === 'categorical' ? lastCategorical.color.colorIndex + 1 : 0;
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
                colorIndex: nextCategoricalIndex % palette.colorCount,
              }
            : { type: 'gradient' },
        touched: false,
      })
    );
  }, [assignments, colorMode.type, data.type, dispatch, palette.colorCount, palette.id]);

  const onClickAddAllCurrentCategories = useCallback(() => {
    if (data.type === 'categories') {
      const lastCategorical = findLast(assignments, (d) => {
        return d.color.type === 'categorical';
      });
      const nextCategoricalIndex =
        lastCategorical?.color.type === 'categorical' ? lastCategorical.color.colorIndex + 1 : 0;

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
                    colorIndex: (nextCategoricalIndex + i) % palette.colorCount,
                  }
                : { type: 'gradient' },
            touched: false,
          };
        }
      );
      dispatch(addNewAssignments(newAssignments));
    }
  }, [
    dispatch,
    assignments,
    colorMode.type,
    data.type,
    palette.colorCount,
    palette.id,
    unmatchingCategories,
  ]);

  return (
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
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="lns-colorMapping-assignmentsList"
        >
          {assignments.map((assignment, i) => {
            return (
              <Assignment
                key={i}
                data={data}
                index={i}
                total={assignments.length}
                colorMode={colorMode}
                palette={palette}
                isDarkMode={isDarkMode}
                getPaletteFn={getPaletteFn}
                assignment={assignment}
                disableDelete={false}
                specialTokens={specialTokens}
                assignmentValuesCounter={assignmentValuesCounter}
              />
            );
          })}
          {assignments.length === 0 && (
            <EuiEmptyPrompt
              paddingSize="s"
              data-test-subj="lns-colorMapping-assignmentsPrompt"
              body={
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'coloring.colorMapping.container.mapValuesPromptDescription.mapValuesPromptDetail',
                      {
                        defaultMessage:
                          'Add new assignments to begin associating terms in your data with specified colors.',
                      }
                    )}
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
                  data-test-subj="lns-colorMapping-assignmentsPromptAddAll"
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
                button={
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    aria-label={i18n.translate(
                      'coloring.colorMapping.container.OpenAdditionalActionsButtonLabel',
                      {
                        defaultMessage: 'Open additional assignments actions',
                      }
                    )}
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
                        dispatch(removeAllAssignments());
                      }}
                      color="danger"
                    >
                      {i18n.translate(
                        'coloring.colorMapping.container.clearAllAssignmentsButtonLabel',
                        {
                          defaultMessage: 'Clear all assignments',
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
  );
}
