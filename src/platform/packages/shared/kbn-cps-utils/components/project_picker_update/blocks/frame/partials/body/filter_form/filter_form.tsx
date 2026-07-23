/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  EuiFormRow,
  EuiForm,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useProjectPickerActions, useProjectPickerState } from '../../../../../state';
import { previewFilterMatchingIds } from '../../../../../state/derivatives';
import { filterFormStyles } from './filter_form.styles';
import { FilterSelectionInput, type FilterInput } from './filter_input';
import { isValidFilterExpression } from '../../../../../utils/filter_input_codec';

export interface ProjectPickerFilterFormProps {
  /**
   * When set, saving updates the existing filter instead of creating a new one.
   */
  filterId?: string;
  /**
   * Callback to be called when the filter form should be closed.
   */
  onCloseFilterFormRequested?: () => void;
}

export function ProjectPickerFilterForm({
  filterId,
  onCloseFilterFormRequested,
}: ProjectPickerFilterFormProps) {
  const { euiTheme } = useEuiTheme();
  const styles = filterFormStyles({ euiTheme });
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const [filterInput, setFilterInput] = useState<FilterInput | null>(null);

  const parsedDefaultFilterExpression = useMemo(() => {
    if (!filterId) {
      return undefined;
    }

    return state.filterExpressions.get(filterId)?.expression;
  }, [filterId, state.filterExpressions]);

  const getFilteringDimensionsOptions = useCallback(
    () => state.filteringDimensions,
    [state.filteringDimensions]
  );

  const getFilterValuesOptions = useCallback(
    (anchor: Partial<FilterInput>) => {
      if (!anchor.tagName) {
        return [];
      }

      const values = state.visibleProjectIds
        .map((projectId) => state.availableProjects.get(projectId)?.[anchor.tagName!])
        .filter((value): value is string => value != null);

      return [...new Set(values)];
    },
    [state.availableProjects, state.visibleProjectIds]
  );

  const previewMatchingIds = useMemo(
    () =>
      previewFilterMatchingIds(
        state.availableProjects,
        state.filterExpressions,
        {
          tagName: filterInput?.tagName,
          operator: filterInput?.operator,
          tagValue: filterInput?.tagValue,
        },
        filterId
      ),
    [filterId, filterInput, state.availableProjects, state.filterExpressions]
  );

  const hasZeroMatchPreview = previewMatchingIds !== null && previewMatchingIds.length === 0;

  const completeFilterExpression = useMemo(
    () => (filterInput && isValidFilterExpression(filterInput) ? filterInput : null),
    [filterInput]
  );

  const shouldDisableCreateFilter = !completeFilterExpression || hasZeroMatchPreview;

  const handleOnCreateFilter = useCallback(async () => {
    try {
      if (!completeFilterExpression) {
        return;
      }

      if (filterId) {
        actions.updateFilterExpression({ id: filterId, expression: completeFilterExpression });
      } else {
        actions.addFilterExpression({ expression: completeFilterExpression });
      }
      onCloseFilterFormRequested?.();
    } catch (error) {
      // TODO: handle error
    }
  }, [actions, completeFilterExpression, filterId, onCloseFilterFormRequested]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem css={styles.filterFormWrapper}>
        <EuiForm>
          <EuiFormRow
            label={null}
            isInvalid={hasZeroMatchPreview}
            helpText={
              hasZeroMatchPreview ? (
                <EuiText color="danger" size="xs">
                  {i18n.translate('cpsUtils.projectPicker.filterBox.filteringDimensionHelpText', {
                    defaultMessage:
                      'No projects match this filter. Adjust so at least one project is included in your search.',
                  })}
                </EuiText>
              ) : undefined
            }
            fullWidth
          >
            <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
              <EuiFlexItem>
                <FilterSelectionInput
                  defaultValue={parsedDefaultFilterExpression}
                  getFilteringDimensionsOptions={getFilteringDimensionsOptions}
                  getFilterValuesOptions={getFilterValuesOptions}
                  onFilterInputChanged={setFilterInput}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false} gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      id="createFilterTooltip"
                      content={i18n.translate('cpsUtils.projectPicker.filterBox.clearFilter', {
                        defaultMessage: 'Create filter',
                      })}
                      position="top"
                    >
                      <EuiButtonIcon
                        size="s"
                        iconType="check"
                        display="base"
                        color="success"
                        aria-labelledby="createFilterTooltip"
                        onClick={handleOnCreateFilter}
                        disabled={shouldDisableCreateFilter}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      id="cancelFilterCreationTooltip"
                      content={i18n.translate('cpsUtils.projectPicker.filterBox.clearFilter', {
                        defaultMessage: 'Cancel filter creation',
                      })}
                      position="top"
                    >
                      <EuiButtonIcon
                        size="s"
                        iconType="cross"
                        display="base"
                        color="danger"
                        aria-labelledby="cancelFilterCreationTooltip"
                        onClick={onCloseFilterFormRequested}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
