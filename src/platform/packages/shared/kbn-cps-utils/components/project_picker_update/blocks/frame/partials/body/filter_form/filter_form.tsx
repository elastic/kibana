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
  EuiFilterGroup,
  EuiFilterButton,
  EuiButtonIcon,
  EuiText,
  EuiCallOut,
  EuiToolTip,
  EuiFormRow,
  EuiForm,
  EuiPopover,
  EuiSelectable,
  type EuiSelectableOption,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useForm, useController, type Control, useWatch } from 'react-hook-form';
import { useProjectPickerActions, useProjectPickerState } from '../../../../../state';
import {
  filterExpressionCodec,
  FilterOperator,
  type FilterOperatorLiteral,
} from '../../../../../utils/codec';
import { filterFormStyles } from './filter_form.styles';

interface ProjectPickerFilterFormProps {
  /**
   * Filter expression are created similar to the elasticsearch filter syntax
   * in the format of "tagName:tagValue", or "-tagName:tagValue"
   */
  defaultFilterExpression?: string | null;
  /**
   * When set, saving updates the existing filter instead of creating a new one.
   */
  filterId?: string;
  /**
   * Callback to be called when the filter form should be closed.
   */
  onCloseFilterFormRequested?: () => void;
}

interface FilterSelectProps {
  control: Control<any>;
  name: string;
  options: { label: string; value: string }[];
  disabled?: boolean;
}

function FilterSelect({ options, control, name, disabled }: FilterSelectProps) {
  const filterPopoverId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const { field } = useController({
    name,
    control,
    rules: { required: true },
  });

  // Reflect the stored form value (a plain string) back onto the EuiSelectable
  // option list by marking the matching option as checked.
  const selectableOptions = useMemo<Array<EuiSelectableOption<{ value: string }>>>(
    () =>
      toSelectableOptions(
        options.map((option) => option.value),
        field.value
      ),
    [options, field.value]
  );

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === field.value)?.label,
    [options, field.value]
  );

  // This is the `setValueAs` equivalent for a controlled field: EuiSelectable
  // hands us the full options array, so we collapse it down to the single
  // selected value before writing it into form state.
  const handleChange = useCallback(
    (newOptions: Array<EuiSelectableOption<{ value: string }>>) => {
      const selected = newOptions.find((option) => option.checked === 'on');
      field.onChange(selected?.value);
      field.onBlur();
      setIsOpen(false);
    },
    [field]
  );

  return (
    <EuiPopover
      aria-labelledby={filterPopoverId}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
        >
          <EuiText>
            {selectedLabel ??
              i18n.translate('cpsUtils.projectPicker.filterBox.selectDimension', {
                defaultMessage: 'Select dimension',
              })}
          </EuiText>
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable
        searchable={false}
        options={selectableOptions}
        onChange={handleChange}
        singleSelection
      >
        {(list) => <div style={{ width: 300 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
}

function toSelectableOptions(
  values: string[],
  selectedValue: string | undefined,
  valueToLabelMapper?: (value: string) => string
) {
  return values.map((value) => ({
    key: value,
    label: valueToLabelMapper?.(value) ?? value,
    value,
    checked: value === selectedValue ? ('on' as const) : undefined,
  }));
}

const operatorDisplayMap: Record<FilterOperatorLiteral, string> = {
  [FilterOperator.EQUALS]: i18n.translate('projectPicker.filterBox.operator.equals', {
    defaultMessage: 'is',
  }),
  [FilterOperator.NOT_EQUALS]: i18n.translate('projectPicker.filterBox.operator.notEquals', {
    defaultMessage: 'is not',
  }),
};

export function ProjectPickerFilterForm({
  defaultFilterExpression,
  filterId,
  onCloseFilterFormRequested,
}: ProjectPickerFilterFormProps) {
  const { euiTheme } = useEuiTheme();
  const styles = filterFormStyles({ euiTheme });
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();

  const parsedDefaultFilterExpression = useMemo(() => {
    return filterExpressionCodec.decode(defaultFilterExpression ?? '');
  }, [defaultFilterExpression]);

  const form = useForm<{
    tagName: string;
    operator: FilterOperatorLiteral;
    tagValue: string;
  }>({
    progressive: true,
    defaultValues: {
      tagName:
        state.filteringDimensions.indexOf(parsedDefaultFilterExpression.tagName ?? '') !== -1
          ? parsedDefaultFilterExpression.tagName
          : undefined,
      operator: parsedDefaultFilterExpression.operator,
      tagValue: parsedDefaultFilterExpression.tagValue,
    },
  });

  const anchoringFilteringTagName = useWatch({ control: form.control, name: 'tagName' });
  const filteringOperator = useWatch({ control: form.control, name: 'operator' });
  const filteringTagValue = useWatch({ control: form.control, name: 'tagValue' });

  const filteringDimensionsOptions = useMemo(
    () => toSelectableOptions(state.filteringDimensions, anchoringFilteringTagName),
    [anchoringFilteringTagName, state.filteringDimensions]
  );

  const filterOperators = useMemo(
    () =>
      toSelectableOptions(Object.values(FilterOperator), filteringOperator, (operator) => {
        return operatorDisplayMap[operator as FilterOperatorLiteral];
      }),
    [filteringOperator]
  );

  const filterValues = useMemo(() => {
    if (!anchoringFilteringTagName) return [];
    const values = state.selectedProjects
      .map((projectId) => state.availableProjects.get(projectId)?.[anchoringFilteringTagName])
      .filter((value): value is string => value != null);
    return toSelectableOptions([...new Set(values)], filteringTagValue);
  }, [
    anchoringFilteringTagName,
    filteringTagValue,
    state.availableProjects,
    state.selectedProjects,
  ]);

  const handleCreateFilter = useCallback(async () => {
    try {
      // validate form
      await form.trigger();
      const filterExpression = filterExpressionCodec.encode(form.getValues());
      if (!filterExpression) {
        // TODO: show error to user
        return;
      }

      if (filterId) {
        actions.updateFilterExpression({ id: filterId, expression: filterExpression });
      } else {
        actions.addFilterExpression({ expression: filterExpression });
      }
      onCloseFilterFormRequested?.();
    } catch (error) {
      // TODO: handle error
    }
  }, [form, actions, filterId, onCloseFilterFormRequested]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutTitle', {
            defaultMessage: 'No projects are currently being searched',
          })}
          color="warning"
        >
          <p>
            {i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutDescription', {
              defaultMessage:
                'Adjust your project filters and toggles to ensure at least one project is included in your search.',
            })}
          </p>
        </EuiCallOut>
      </EuiFlexItem>
      <EuiFlexItem css={styles.filterFormWrapper}>
        <EuiForm>
          <EuiFormRow
            label={null}
            helpText={i18n.translate(
              'cpsUtils.projectPicker.filterBox.filteringDimensionHelpText',
              {
                defaultMessage: 'Select the dimension to filter by',
              }
            )}
            isInvalid={true}
            fullWidth
          >
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiFilterGroup css={styles.filterFormSelectGroup} fullWidth>
                  <FilterSelect
                    options={filteringDimensionsOptions}
                    control={form.control}
                    name="tagName"
                  />
                  <FilterSelect
                    options={filterOperators}
                    control={form.control}
                    name="operator"
                    disabled={!anchoringFilteringTagName}
                  />
                  <FilterSelect
                    options={filterValues}
                    control={form.control}
                    name="tagValue"
                    disabled={!anchoringFilteringTagName}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('cpsUtils.projectPicker.filterBox.clearFilter', {
                        defaultMessage: 'Create filter',
                      })}
                      position="top"
                    >
                      <EuiButtonIcon
                        size="m"
                        iconType="check"
                        display="base"
                        color="success"
                        aria-labelledby=""
                        onClick={handleCreateFilter}
                        disabled={
                          !anchoringFilteringTagName || !filteringOperator || !filteringTagValue
                        }
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('cpsUtils.projectPicker.filterBox.clearFilter', {
                        defaultMessage: 'Cancel filter creation',
                      })}
                      position="top"
                    >
                      <EuiButtonIcon
                        size="m"
                        iconType="cross"
                        display="base"
                        color="danger"
                        aria-labelledby=""
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
