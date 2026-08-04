/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type ComponentProps, useEffect, useMemo, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFilterGroup,
  EuiSuperSelect,
  EuiComboBox,
  type EuiSuperSelectProps,
  type EuiComboBoxOptionOption,
  type EuiComboBoxOptionsListProps,
} from '@elastic/eui';
import { useForm, useController, type Control, Controller } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import {
  type FilterOperatorLiteral,
  FilterOperator,
  OperatorKind,
  getOperatorKind,
} from '../../../../../../utils/filter_input_codec';

export interface FilterInput {
  tagName: string;
  operator: FilterOperatorLiteral;
  tagValue: string[] | string | undefined;
}

interface FilterSelectionInputProps {
  defaultValue?: FilterInput;
  onFilterInputChanged: (filterInput: FilterInput) => void;
  isInvalid?: boolean;
  getFilteringDimensionsOptions: () => string[];
  getFilterValuesOptions: (anchor: Omit<Partial<FilterInput>, 'tagValue'>) => string[];
}

interface FilterInputStandardSelectProps
  extends Pick<EuiSuperSelectProps, 'compressed' | 'disabled' | 'placeholder' | 'aria-label'> {
  control: Control<Exclude<FilterInput, { tagValue: undefined }>>;
  name: Exclude<keyof FilterInput, 'tagValue'>;
  options: ReturnType<typeof toSelectableOptions>;
  placeholder?: string;
}

const operatorDisplayMap: Record<FilterOperatorLiteral, string> = {
  [FilterOperator.EQUALS]: i18n.translate('cpsUtils.projectPicker.filterBox.operator.equals', {
    defaultMessage: 'is',
  }),
  [FilterOperator.NOT_EQUALS]: i18n.translate(
    'cpsUtils.projectPicker.filterBox.operator.notEquals',
    {
      defaultMessage: 'is not',
    }
  ),
  [FilterOperator.ONE_OF]: i18n.translate('cpsUtils.projectPicker.filterBox.operator.oneOf', {
    defaultMessage: 'is one of',
  }),
  [FilterOperator.NOT_ONE_OF]: i18n.translate(
    'cpsUtils.projectPicker.filterBox.operator.notOneOf',
    {
      defaultMessage: 'is not one of',
    }
  ),
  [FilterOperator.EXISTS]: i18n.translate('cpsUtils.projectPicker.filterBox.operator.exists', {
    defaultMessage: 'exists',
  }),
  [FilterOperator.NOT_EXISTS]: i18n.translate(
    'cpsUtils.projectPicker.filterBox.operator.notExists',
    {
      defaultMessage: 'does not exist',
    }
  ),
};

function toSelectableOptions(values: string[], valueToLabelMapper?: (value: string) => string) {
  return values.map((value) => ({
    key: value,
    label: valueToLabelMapper?.(value) ?? value,
    value,
    inputDisplay: valueToLabelMapper?.(value) ?? value,
    dropdownDisplay: valueToLabelMapper?.(value) ?? value,
  }));
}

function FilterInputStandardSelect({
  control,
  options,
  name,
  ...props
}: FilterInputStandardSelectProps) {
  const { field } = useController({
    name,
    control,
    rules: { required: true },
  });

  const handleChange = useCallback<NonNullable<EuiSuperSelectProps['onChange']>>(
    (value) => {
      field.onChange(value);
      field.onBlur();
    },
    [field]
  );

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={field.value}
      onChange={handleChange}
      {...props}
    />
  );
}

export function FilterSelectionInput({
  defaultValue,
  onFilterInputChanged,
  getFilteringDimensionsOptions,
  getFilterValuesOptions,
}: FilterSelectionInputProps) {
  const form = useForm<FilterInput>({
    ...(defaultValue ? { defaultValues: defaultValue } : {}),
  });

  const [anchoringFilteringTagName, filteringOperator, filteringTagValue] = form.watch([
    'tagName',
    'operator',
    'tagValue',
  ]);

  useEffect(() => {
    if (anchoringFilteringTagName && !filteringOperator) {
      // when a filtering dimension is selected, set a default operator of "EQUALS"
      form.setValue('operator', FilterOperator.EQUALS);
    }
  }, [anchoringFilteringTagName, filteringOperator, form]);

  useEffect(() => {
    if (filteringOperator || filteringTagValue) {
      onFilterInputChanged(form.getValues());
    }
  }, [filteringTagValue, filteringOperator, form, onFilterInputChanged]);

  const isMultiValueOperator = useMemo(() => {
    return (
      filteringOperator !== undefined && getOperatorKind(filteringOperator) === OperatorKind.ONE_OF
    );
  }, [filteringOperator]);

  const isExistenceCheckOperator = useMemo(() => {
    return (
      filteringOperator !== undefined && getOperatorKind(filteringOperator) === OperatorKind.EXISTS
    );
  }, [filteringOperator]);

  const filteringDimensionsOptions = useMemo(
    () => toSelectableOptions(getFilteringDimensionsOptions()),
    [getFilteringDimensionsOptions]
  );

  const filterOperators = useMemo(
    () =>
      toSelectableOptions(Object.values(FilterOperator), (operator) => {
        return operatorDisplayMap[operator as FilterOperatorLiteral];
      }),
    []
  );

  const [customFilterValues, setCustomFilterValues] = useState<string[]>([]);

  const filterValues = useMemo(() => {
    return toSelectableOptions(
      ([] as string[]).concat(
        customFilterValues,
        getFilterValuesOptions({ tagName: anchoringFilteringTagName, operator: filteringOperator })
      )
    );
  }, [anchoringFilteringTagName, customFilterValues, filteringOperator, getFilterValuesOptions]);

  const renderTagValueInput = useCallback<
    ComponentProps<typeof Controller<FilterInput, 'tagValue'>>['render']
  >(
    ({ field }) => {
      const handleChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
        if (isMultiValueOperator) {
          field.onChange(options.map((option) => option.value));
        } else {
          field.onChange(options[0]?.value);
        }
      };

      const selectedOptions = filterValues.filter((option) =>
        Array.isArray(field.value)
          ? field.value.includes(option.value)
          : field.value === option.value
      );

      const onCreateOption: NonNullable<EuiComboBoxOptionsListProps<string>['onCreateOption']> = (
        searchValue
      ) => {
        const normalizedSearchValue = searchValue.trim().toLowerCase();

        if (!normalizedSearchValue) {
          return;
        }

        setCustomFilterValues((prev) => [...prev, normalizedSearchValue]);

        if (isMultiValueOperator) {
          // Select the option.
          field.onChange([normalizedSearchValue]);
        } else {
          field.onChange(normalizedSearchValue);
        }
      };

      const isDisabled =
        !anchoringFilteringTagName || !filteringOperator || isExistenceCheckOperator;

      return (
        <EuiComboBox
          {...field}
          options={filterValues}
          onChange={handleChange}
          selectedOptions={selectedOptions}
          singleSelection={isMultiValueOperator ? false : { asPlainText: true }}
          isDisabled={isDisabled}
          onCreateOption={onCreateOption}
          customOptionText={i18n.translate('cpsUtils.projectPicker.filterBox.customOptionText', {
            defaultMessage: "Add '{searchValue}' as your search value on {tagName}",
            values: {
              tagName: anchoringFilteringTagName,
            },
          })}
          placeholder={
            isDisabled
              ? undefined
              : i18n.translate('cpsUtils.projectPicker.filterBox.selectValue', {
                  defaultMessage: 'Select a value',
                })
          }
          compressed
          fullWidth
        />
      );
    },
    [
      filterValues,
      isMultiValueOperator,
      anchoringFilteringTagName,
      filteringOperator,
      isExistenceCheckOperator,
    ]
  );

  const styles = useCallback(
    ({ euiTheme }: UseEuiTheme) => ({
      '& > *': {
        flexBasis: 'calc(100% / 3) !important',
      },
      '& > *:not(:last-child)': {
        borderRight: `1px solid ${euiTheme.colors.borderBasePlain}`,
      },
      '& > * button, & > * [data-test-subj="comboBoxInput"]': {
        borderRadius: 'unset',
        borderWidth: '0',
        borderStyle: 'none',
        borderColor: 'transparent',
        boxShadow: 'none',
      },
    }),
    []
  );

  return (
    <EuiFilterGroup css={styles}>
      <FilterInputStandardSelect
        control={form.control}
        name="tagName"
        options={filteringDimensionsOptions}
        placeholder={i18n.translate('cpsUtils.projectPicker.filterBox.selectDimension', {
          defaultMessage: 'Select a tag',
        })}
        compressed
      />
      <FilterInputStandardSelect
        control={form.control}
        name="operator"
        options={filterOperators}
        disabled={!anchoringFilteringTagName}
        compressed
      />
      <Controller
        control={form.control}
        name="tagValue"
        render={renderTagValueInput}
        rules={{
          required: !isExistenceCheckOperator,
        }}
      />
    </EuiFilterGroup>
  );
}
