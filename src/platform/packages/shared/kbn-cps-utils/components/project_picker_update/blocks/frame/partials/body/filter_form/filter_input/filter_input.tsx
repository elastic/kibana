/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiSuperSelect,
  EuiComboBox,
  type EuiSuperSelectProps,
  type EuiComboBoxOptionOption,
  type EuiComboBoxOptionsListProps,
} from '@elastic/eui';
import type { UseFormReturn, UseControllerProps } from 'react-hook-form';
import { useController, type Control, Controller } from 'react-hook-form';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
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
  form: UseFormReturn<FilterInput>;
  onFilterInputChanged: (filterInput: FilterInput) => void;
  /**
   * Business-rule validator invoked by RHF on submit (and on revalidation).
   * Return `true` when valid, or an error message string when invalid.
   * May be async when validating against the server.
   */
  validateExpression: (input: FilterInput) => true | string | Promise<true | string>;
  getFilteringDimensionsOptions: () => string[];
  getFilterValuesOptions: (anchor: Omit<Partial<FilterInput>, 'tagValue'>) => string[];
}

type FilterInputSelectName = Exclude<keyof FilterInput, 'tagValue'>;

interface FilterInputStandardSelectProps<TName extends FilterInputSelectName>
  extends Pick<
    EuiSuperSelectProps,
    'compressed' | 'disabled' | 'placeholder' | 'aria-label' | 'fullWidth' | 'popoverProps' | 'css'
  > {
  control: Control<FilterInput>;
  name: TName;
  rules?: UseControllerProps<FilterInput, TName>['rules'];
  options: ReturnType<typeof toSelectableOptions>;
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

function toComboBoxOptions(values: string[]): Array<EuiComboBoxOptionOption<string>> {
  return values.map((value) => ({
    key: value,
    label: value,
    value,
  }));
}

function toTagValueList(tagValue: FilterInput['tagValue']): string[] {
  if (tagValue == null) {
    return [];
  }

  return Array.isArray(tagValue) ? tagValue : [tagValue];
}

function isMultiValueOperator(operator: FilterOperatorLiteral | undefined) {
  return operator !== undefined && getOperatorKind(operator) === OperatorKind.ONE_OF;
}

function isExistenceCheckOperator(operator: FilterOperatorLiteral | undefined) {
  return operator !== undefined && getOperatorKind(operator) === OperatorKind.EXISTS;
}

function FilterInputStandardSelect<TName extends FilterInputSelectName>({
  control,
  options,
  name,
  rules,
  ...props
}: FilterInputStandardSelectProps<TName>) {
  const { field, fieldState } = useController<FilterInput, TName>({
    name,
    control,
    rules,
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
      buttonRef={field.ref}
      options={options}
      valueOfSelected={field.value}
      onChange={handleChange}
      isInvalid={fieldState.error != null}
      fullWidth
      {...props}
    />
  );
}

export function FilterSelectionInput({
  form,
  onFilterInputChanged,
  validateExpression,
  getFilteringDimensionsOptions,
  getFilterValuesOptions,
}: FilterSelectionInputProps) {
  const {
    formState: { errors },
  } = form;

  const [anchoringFilteringTagName, filteringOperator, filteringTagValue] = form.watch([
    'tagName',
    'operator',
    'tagValue',
  ]);

  const isMultiValueFilteringOperation = useMemo(
    () => isMultiValueOperator(filteringOperator),
    [filteringOperator]
  );
  const isExistenceCheckFilteringOperation = useMemo(
    () => isExistenceCheckOperator(filteringOperator),
    [filteringOperator]
  );

  useEffect(() => {
    if (anchoringFilteringTagName && !filteringOperator) {
      // when a filtering dimension is selected, set a default operator of "EQUALS"
      form.setValue('operator', FilterOperator.EQUALS);
    }
  }, [anchoringFilteringTagName, filteringOperator, form]);

  useEffect(() => {
    // clear errors when new values are set
    form.clearErrors();
  }, [anchoringFilteringTagName, filteringOperator, filteringTagValue, form]);

  useEffect(() => {
    if (!isExistenceCheckFilteringOperation || filteringTagValue === undefined) {
      return;
    }

    // reset the tag value when the operator is changed to an existence check operator
    form.resetField('tagValue', { defaultValue: undefined });
  }, [filteringOperator, filteringTagValue, form, isExistenceCheckFilteringOperation]);

  useEffect(() => {
    if (filteringOperator || filteringTagValue) {
      onFilterInputChanged(form.getValues());
    }
  }, [filteringTagValue, filteringOperator, form, onFilterInputChanged]);

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

  const knownFilterValues = useMemo(
    () =>
      getFilterValuesOptions({
        tagName: anchoringFilteringTagName,
        operator: filteringOperator,
      }),
    [anchoringFilteringTagName, filteringOperator, getFilterValuesOptions]
  );

  const [customFilterValues, setCustomFilterValues] = useState<string[]>(() => {
    const knownValues = new Set(
      getFilterValuesOptions({
        tagName: form.getValues('tagName'),
        operator: form.getValues('operator'),
      })
    );

    return toTagValueList(form.getValues('tagValue')).filter((value) => !knownValues.has(value));
  });

  const previousTagNameRef = useRef(anchoringFilteringTagName);

  useEffect(() => {
    if (previousTagNameRef.current === anchoringFilteringTagName) {
      return;
    }

    previousTagNameRef.current = anchoringFilteringTagName;
    setCustomFilterValues([]);
  }, [anchoringFilteringTagName]);

  useEffect(() => {
    if (!errors.tagValue) {
      return;
    }

    const failedValues = new Set(toTagValueList(filteringTagValue));
    setCustomFilterValues((prevCustomFilterValues) =>
      prevCustomFilterValues.filter((value) => !failedValues.has(value))
    );
  }, [filteringTagValue, errors.tagValue]);

  const filterValues = useMemo(() => {
    return toComboBoxOptions([...new Set([...customFilterValues, ...knownFilterValues])]);
  }, [customFilterValues, knownFilterValues]);

  const renderTagValueInput = useCallback<
    ComponentProps<typeof Controller<FilterInput, 'tagValue'>>['render']
  >(
    ({ field: { ref, ...field }, fieldState }) => {
      const handleChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
        if (isMultiValueFilteringOperation) {
          field.onChange(options.map((option) => option.value));
        } else {
          field.onChange(options[0]?.value);
        }
      };

      const selectedOptions = toComboBoxOptions(toTagValueList(field.value));

      const onCreateOption: NonNullable<EuiComboBoxOptionsListProps<string>['onCreateOption']> = (
        searchValue
      ) => {
        const normalizedSearchValue = searchValue.trim().toLowerCase();

        if (!normalizedSearchValue) {
          return;
        }

        setCustomFilterValues((prev) =>
          prev.includes(normalizedSearchValue) ? prev : [...prev, normalizedSearchValue]
        );

        if (isMultiValueFilteringOperation) {
          const currentValues = Array.isArray(field.value) ? field.value : [];

          if (currentValues.includes(normalizedSearchValue)) {
            return;
          }

          field.onChange([...currentValues, normalizedSearchValue]);
        } else {
          field.onChange(normalizedSearchValue);
        }
      };

      const panelMinWidth = calculateWidthFromEntries(filterValues, ['label']);

      const isDisabled =
        !anchoringFilteringTagName || !filteringOperator || isExistenceCheckFilteringOperation;

      return (
        <EuiComboBox
          {...field}
          options={filterValues}
          onChange={handleChange}
          selectedOptions={selectedOptions}
          singleSelection={isMultiValueFilteringOperation ? false : { asPlainText: true }}
          isDisabled={isDisabled}
          isInvalid={fieldState.error != null}
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
          isClearable={false}
          inputRef={ref}
          truncationProps={{ truncation: 'middle' as const }}
          inputPopoverProps={{ panelMinWidth, anchorPosition: 'downRight' }}
          compressed
          fullWidth
        />
      );
    },
    [
      filterValues,
      anchoringFilteringTagName,
      filteringOperator,
      isExistenceCheckFilteringOperation,
      isMultiValueFilteringOperation,
    ]
  );

  const styles = useCallback(
    ({ euiTheme }: UseEuiTheme) => ({
      display: 'flex' as const,
      flexDirection: 'row' as const,
      borderRadius: euiTheme.border.radius.medium,

      '& > *': {
        flexGrow: 1,
        flexShrink: 1,
      },

      '& > *:nth-child(3n+1), & > *:nth-child(3n+2)': {
        flexBasis: '50%',
      },

      '& > *:nth-child(3n+3)': {
        flexBasis: '100%',
      },

      [`@media (min-width: ${euiTheme.breakpoint.s}px)`]: {
        flexWrap: 'nowrap' as const,

        '& > *:nth-child(3n+1), & > *:nth-child(3n+2), & > *:nth-child(3n+3)': {
          flexBasis: 'calc(100% / 3)',
          flexShrink: 1,
          flexGrow: 0,
        },

        '& > *:nth-child(3n+1) button:not(:has(svg)), & > *:nth-child(3n+1) [data-test-subj="comboBoxInput"]':
          {
            borderRight: 'none',
            borderTopRightRadius: 'unset',
            borderBottomRightRadius: 'unset',
          },
        '& > *:nth-child(3n+2) button:not(:has(svg)), & > *:nth-child(3n+2) [data-test-subj="comboBoxInput"]':
          {
            borderRadius: 'unset',
            boxShadow:
              'inset 0 1px 0 0 var(--euiFormControlStateColor), inset 0 -1px 0 0 var(--euiFormControlStateColor)',
          },
        '& > *:nth-child(3n+3) button:not(:has(svg)), & > *:nth-child(3n+3) [data-test-subj="comboBoxInput"]':
          {
            borderLeft: 'none',
            borderTopLeftRadius: 'unset',
            borderBottomLeftRadius: 'unset',
          },
      },
    }),
    []
  );

  return (
    <div css={styles}>
      <FilterInputStandardSelect
        control={form.control}
        name="tagName"
        options={filteringDimensionsOptions}
        placeholder={i18n.translate('cpsUtils.projectPicker.filterBox.selectDimension', {
          defaultMessage: 'Select a tag',
        })}
        popoverProps={{
          anchorPosition: 'downLeft',
          panelMinWidth: calculateWidthFromEntries(filteringDimensionsOptions, ['label']),
        }}
        rules={{
          required: true,
        }}
        compressed
        fullWidth
      />
      <FilterInputStandardSelect
        control={form.control}
        name="operator"
        options={filterOperators}
        disabled={!anchoringFilteringTagName}
        fullWidth={false}
        popoverProps={{
          anchorPosition: 'downLeft',
          panelMinWidth: calculateWidthFromEntries(filterOperators, ['label']),
        }}
        rules={{
          required: true,
          validate: (value, formValues) => {
            if (isExistenceCheckFilteringOperation) {
              return validateExpression(formValues);
            }
            return !!value;
          },
          deps: ['tagName'],
        }}
        compressed
      />
      <Controller
        control={form.control}
        name="tagValue"
        render={renderTagValueInput}
        rules={{
          required: !isExistenceCheckFilteringOperation,
          validate: (_value, formValues) => {
            if (isExistenceCheckFilteringOperation) {
              return true;
            }

            return validateExpression(formValues);
          },
          deps: ['tagName', 'operator'],
        }}
      />
    </div>
  );
}
