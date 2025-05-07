/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { KbnPalettes } from '@kbn/palettes';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { deserializeField } from '@kbn/data-plugin/common';
import { Assignment } from '../assignment/assignment';
import {
  addNewAssignment,
  addNewAssignments,
  removeAllAssignments,
} from '../../state/color_mapping';
import { selectColorMode, selectComputedAssignments, selectPalette } from '../../state/selectors';
import { ColorMappingInputData } from '../../categorical_color_mapping';
import { ColorMapping } from '../../config';
import { getColorAssignmentMatcher } from '../../color/color_assignment_matcher';

export function Assignments({
  data,
  palettes,
  isDarkMode,
  specialTokens,
  formatter,
  allowCustomMatch,
}: {
  palettes: KbnPalettes;
  data: ColorMappingInputData;
  isDarkMode: boolean;
  /**
   * map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket
   */
  specialTokens: Map<string, string>;
  formatter?: IFieldFormat;
  allowCustomMatch?: boolean;
}) {
  const [showOtherActions, setShowOtherActions] = useState<boolean>(false);

  const dispatch = useDispatch();
  const palette = useSelector(selectPalette(palettes));
  const colorMode = useSelector(selectColorMode);
  const assignments = useSelector(selectComputedAssignments);
  const assignmentMatcher = useMemo(() => getColorAssignmentMatcher(assignments), [assignments]);
  const unmatchingCategories = useMemo(() => {
    return data.type === 'categories'
      ? data.categories.filter((category) => {
          const rawValue = deserializeField(category);
          return !assignmentMatcher.hasMatch(rawValue);
        })
      : [];
  }, [data, assignmentMatcher]);

  const onClickAddNewAssignment = useCallback(() => {
    const lastCategorical = assignments.findLast((a) => {
      return a.color.type === 'categorical';
    });
    const nextCategoricalIndex =
      lastCategorical?.color.type === 'categorical' ? lastCategorical.color.colorIndex + 1 : 0;
    dispatch(
      addNewAssignment({
        rules: [],
        color:
          colorMode.type === 'categorical'
            ? {
                type: 'categorical',
                paletteId: palette.id,
                colorIndex: nextCategoricalIndex % palette.colors().length,
              }
            : { type: 'gradient' },
        touched: false,
      })
    );
  }, [assignments, colorMode.type, dispatch, palette]);

  const onClickAddAllCurrentCategories = useCallback(() => {
    if (data.type === 'categories') {
      const lastCategorical = findLast(assignments, (d) => {
        return d.color.type === 'categorical';
      });
      const nextCategoricalIndex =
        lastCategorical?.color.type === 'categorical' ? lastCategorical.color.colorIndex + 1 : 0;

      const newAssignments = unmatchingCategories.map((category, i) => {
        return {
          rules: [
            {
              type: 'raw',
              value: category,
            },
          ],
          color:
            colorMode.type === 'categorical'
              ? {
                  type: 'categorical',
                  paletteId: palette.id,
                  colorIndex: (nextCategoricalIndex + i) % palette.colors().length,
                }
              : { type: 'gradient' },
          touched: false,
        } satisfies ColorMapping.Assignment;
      });
      dispatch(addNewAssignments(newAssignments));
    }
  }, [data.type, assignments, unmatchingCategories, dispatch, colorMode.type, palette]);

  return (
    <EuiPanel
      color="subdued"
      borderRadius="m"
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
                assignments={assignments}
                colorMode={colorMode}
                palette={palette}
                palettes={palettes}
                isDarkMode={isDarkMode}
                assignment={assignment}
                disableDelete={false}
                specialTokens={specialTokens}
                formatter={formatter}
                allowCustomMatch={allowCustomMatch}
                assignmentMatcher={assignmentMatcher}
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
                          'Add a new assignment to manually associate terms with specified colors.',
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

      {assignments.length > 0 && (
        <div
          css={css`
            padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingSmall};
            overflow: hidden;
          `}
        >
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
                    color="text"
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
                      css={css`
                        color: ${euiThemeVars.euiColorDanger};
                      `}
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
        </div>
      )}
    </EuiPanel>
  );
}
