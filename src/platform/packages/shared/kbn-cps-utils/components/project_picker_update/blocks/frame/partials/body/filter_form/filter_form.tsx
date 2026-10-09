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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useForm, FormProvider, type FieldErrors } from 'react-hook-form';
import { useProjectPickerActions, useProjectPickerState } from '../../../../../state';
import {
  previewFilterMatchingIds,
  isDuplicateFilterExpressionDraft,
} from '../../../../../state/derivatives';
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

function getFirstErrorMessage(errors: FieldErrors<FilterInput>): string | null {
  const message =
    errors.tagValue?.message ?? errors.tagName?.message ?? errors.operator?.message ?? null;
  return typeof message === 'string' ? message : null;
}

export function ProjectPickerFilterForm({
  filterId,
  onCloseFilterFormRequested,
}: ProjectPickerFilterFormProps) {
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const [filterInput, setFilterInput] = useState<FilterInput | null>(null);

  const parsedDefaultFilterExpression = useMemo(() => {
    if (!filterId) {
      return undefined;
    }

    return state.filterExpressions.get(filterId)?.expression;
  }, [filterId, state.filterExpressions]);

  const form = useForm<FilterInput>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    ...(parsedDefaultFilterExpression ? { values: parsedDefaultFilterExpression } : {}),
  });

  const { errors } = form.formState;

  const getFilteringDimensionsOptions = useCallback(
    () => state.filteringDimensions,
    [state.filteringDimensions]
  );

  const getFilterValuesOptions = useCallback(
    (anchor: Partial<FilterInput>) => {
      if (!anchor.tagName) {
        return [];
      }

      let values: (string | undefined)[] = [];

      if (!filterId) {
        // When creating a new filter, we want to select within the range of the visible projects
        values = state.visibleProjectIds.map(
          (projectId) => state.availableProjects.get(projectId)?.[anchor.tagName!]
        );
      } else {
        // However, when editing an existing filter we want to widen the values to include all values from the anchor on available projects
        values = Array.from(state.availableProjects.values()).map(
          (project) => project[anchor.tagName!]
        );
      }

      return [...new Set(values.filter((value): value is string => value != null))];
    },
    [state.availableProjects, state.visibleProjectIds, filterId]
  );

  const completeFilterExpression = useMemo(
    () => (filterInput && isValidFilterExpression(filterInput) ? filterInput : null),
    [filterInput]
  );

  const shouldDisableCreateFilter = !completeFilterExpression;

  const validateExpression = useCallback(
    (input: FilterInput): true | string => {
      if (!isValidFilterExpression(input)) {
        return true;
      }

      const matchingIds = previewFilterMatchingIds(
        state.availableProjects,
        state.filterExpressions,
        input,
        filterId
      );

      if (matchingIds !== null && matchingIds.length === 0) {
        return i18n.translate('cpsUtils.projectPicker.filterBox.filteringDimensionHelpText', {
          defaultMessage:
            'No projects match this filter. Adjust so at least one project is included in your search.',
        });
      }

      if (isDuplicateFilterExpressionDraft(state.filterExpressions, input, filterId)) {
        return i18n.translate('cpsUtils.projectPicker.filterBox.duplicateFilterHelpText', {
          defaultMessage: 'This filter already exists. Change the filter or edit the existing one.',
        });
      }

      return true;
    },
    [filterId, state.availableProjects, state.filterExpressions]
  );

  const handleValidFilterInput = useCallback(
    (input: FilterInput) => {
      if (!isValidFilterExpression(input)) {
        return;
      }

      if (filterId) {
        actions.updateFilterExpression({ id: filterId, expression: input });
      } else {
        actions.addFilterExpression({ expression: input });
      }
      onCloseFilterFormRequested?.();
    },
    [actions, filterId, onCloseFilterFormRequested]
  );

  const handleOnCreateFilter = useCallback(() => {
    void form.handleSubmit(handleValidFilterInput)();
  }, [form, handleValidFilterInput]);

  const validationError = getFirstErrorMessage(errors);

  const filterFormHelpText = validationError ? (
    <EuiText color="danger" size="xs">
      {validationError}
    </EuiText>
  ) : null;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <FormProvider {...form}>
          <EuiForm>
            <EuiFormRow
              label={null}
              isInvalid={Object.keys(errors).length > 0}
              helpText={filterFormHelpText}
              fullWidth
            >
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
                <EuiFlexItem>
                  <FilterSelectionInput
                    form={form}
                    getFilteringDimensionsOptions={getFilteringDimensionsOptions}
                    getFilterValuesOptions={getFilterValuesOptions}
                    onFilterInputChanged={setFilterInput}
                    validateExpression={validateExpression}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup responsive={false} gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        id="createFilterTooltip"
                        content={i18n.translate('cpsUtils.projectPicker.filterBox.createFilter', {
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
                          data-test-subj="projectPickerFilterFormCreateBtn"
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
                          data-test-subj="projectPickerFilterFormCancelBtn"
                          onClick={onCloseFilterFormRequested}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiForm>
        </FormProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
