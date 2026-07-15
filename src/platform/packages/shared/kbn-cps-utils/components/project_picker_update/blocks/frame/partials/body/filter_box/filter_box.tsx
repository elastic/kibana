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
  EuiPopoverTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useForm, useController, type Control } from 'react-hook-form';
import { useProjectPickerActions } from '../../../../../state';
import { filterExpressionCodec } from './utils/codec';
import { filterBoxStyles } from './filter_box.styles';

interface ProjectPickerFilterBoxProps {
  /**
   * Filter expression are created similar to the elasticsearch filter syntax
   * in the format of "tagName:tagValue", or "-tagName:tagValue"
   */
  defaultFilterExpression?: string;
  filteringDimensions: string[];
}

enum FilterOperator {
  EQUALS = 'is',
  NOT_EQUALS = 'is not',
}

interface FilterSelectProps {
  control: Control<any>;
  name: string;
  options: { label: string; value: string }[];
  disabled?: boolean;
}

function FilterSelect({ options, control, name, disabled }: FilterSelectProps) {
  const filterPopoverId = useGeneratedHtmlId();

  const { field } = useController({
    name,
    control,
    rules: { required: true },
  });

  const [isOpen, setIsOpen] = useState(false);

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
            {field.value ??
              i18n.translate('cpsUtils.projectPicker.filterBox.selectDimension', {
                defaultMessage: 'Select dimension',
              })}
          </EuiText>
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiSelectable searchable={false} options={options} {...field}>
        {(list, search) => (
          <div style={{ width: 300 }}>
            <EuiPopoverTitle id={filterPopoverId} paddingSize="s">
              {search}
            </EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}

export function ProjectPickerFilterBox({
  filteringDimensions,
  defaultFilterExpression,
}: ProjectPickerFilterBoxProps) {
  const { euiTheme } = useEuiTheme();
  const styles = filterBoxStyles({ euiTheme });
  const actions = useProjectPickerActions();

  const parsedFilterExpression = useMemo(() => {
    return filterExpressionCodec.decode(defaultFilterExpression ?? '');
  }, [defaultFilterExpression]);

  const form = useForm<{
    tagName: string;
    operator: FilterOperator;
    tagValue: string;
  }>({
    defaultValues: {
      tagName:
        filteringDimensions.indexOf(parsedFilterExpression.tagName ?? '') !== -1
          ? parsedFilterExpression.tagName
          : undefined,
      operator: parsedFilterExpression.operator,
      tagValue: parsedFilterExpression.tagValue,
    },
  });

  const filteringDimensionsOptions = useMemo(
    () =>
      filteringDimensions.map((dimension) => ({
        label: dimension,
        value: dimension,
        text: dimension,
      })),
    [filteringDimensions]
  );

  const filterOperators = useMemo(
    () =>
      Object.values(FilterOperator).map((operator) => ({
        label: operator,
        value: operator,
        text: operator,
      })),
    []
  );

  const filterValues = useMemo(
    () =>
      Object.values(FilterOperator).map((operator) => ({
        label: operator,
        value: operator,
        text: operator,
      })),
    []
  );

  const handleCreateFilter = useCallback(async () => {
    try {
      // validate form
      await form.trigger();
      const filterExpression = filterExpressionCodec.encode(form.getValues());
      if (!filterExpression) {
        // TODO: show error to user
        return;
      }
      actions.setFilterExpression({ filterExpression });
    } catch (error) {
      // TODO: handle error
    }
  }, [form, actions]);

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
                <EuiFilterGroup fullWidth>
                  <FilterSelect
                    options={filteringDimensionsOptions}
                    control={form.control}
                    name="tagName"
                  />
                  <FilterSelect options={filterOperators} control={form.control} name="operator" />
                  <FilterSelect options={filterValues} control={form.control} name="tagValue" />
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
