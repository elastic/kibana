/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { alertsFiltersMetadata } from '../filters';
import { AlertsFiltersFormContextProvider } from '../contexts/alerts_filters_form_context';
import {
  AlertsFilter,
  AlertsFiltersExpression,
  AlertsFiltersFormItemType,
  AlertsFiltersExpressionOperator,
} from '../types';
import {
  ADD_OPERATION_LABEL,
  AND_OPERATOR,
  DELETE_OPERAND_LABEL,
  getMaxFiltersNote,
  OR_OPERATOR,
} from '../translations';
import { AlertsFiltersFormItem } from './alerts_filters_form_item';
import { isFilter } from '../utils';
import {
  ADD_AND_OPERATION_BUTTON_SUBJ,
  ADD_OR_OPERATION_BUTTON_SUBJ,
  DELETE_OPERAND_BUTTON_SUBJ,
  FILTERS_FORM_SUBJ,
} from '../constants';

export interface AlertsFiltersFormProps {
  /**
   * Restricts the queries used by filters to these rule types
   */
  ruleTypeIds: string[];
  /**
   * The current filters expression
   */
  value?: AlertsFiltersExpression;
  /**
   * Callback for changes is the filters expression
   */
  onChange: (newValue: AlertsFiltersExpression) => void;
  /**
   * Disables all the filters
   */
  isDisabled?: boolean;
  /**
   * Restricts the total number of filters, preventing the user from creating more
   */
  maxFilters?: number;
  /**
   * Service dependencies
   */
  services: {
    http: HttpStart;
    notifications: NotificationsStart;
  };
}

// This ensures that the form is initialized with an initially empty "Filter by" selector
const DEFAULT_VALUE: AlertsFiltersExpression = [{ filter: {} }];
const DEFAULT_MAX_FILTERS = 5;

/**
 * A form to build boolean expressions of filters for alerts searches
 */
export const AlertsFiltersForm = ({
  ruleTypeIds,
  value = DEFAULT_VALUE,
  onChange,
  isDisabled = false,
  maxFilters = DEFAULT_MAX_FILTERS,
  services,
}: AlertsFiltersFormProps) => {
  const [firstItem, ...otherItems] = value as [
    {
      filter: AlertsFilter;
    },
    ...AlertsFiltersExpression
  ];
  const lastFilterEmpty = useMemo(() => {
    if (!Boolean(value?.length)) {
      return true;
    }
    const { filter: lastFilter } = value[value.length - 1] as Extract<
      AlertsFiltersExpression,
      { filter: AlertsFilter }
    >;
    if (!lastFilter.type) {
      return true;
    }
    const { isEmpty } = alertsFiltersMetadata[lastFilter.type];
    return isEmpty((lastFilter as AlertsFilter<Parameters<typeof isEmpty>[0]>).value);
  }, [value]);

  const addOperand = useCallback(
    (operator: AlertsFiltersExpressionOperator) => {
      onChange([
        ...value,
        {
          operator,
        },
        { filter: {} },
      ]);
    },
    [onChange, value]
  );

  const deleteOperand = useCallback(
    (atIndex: number) => {
      // Remove two items: the operator and the following filter
      const newValue = [...value];
      newValue.splice(atIndex, 2);
      onChange(newValue);
    },
    [onChange, value]
  );

  const onFormItemTypeChange = useCallback(
    (atIndex: number, newType: AlertsFiltersFormItemType) => {
      const newValue = [...value];
      const expressionItem = value[atIndex];
      if (isFilter(expressionItem)) {
        newValue[atIndex] = {
          filter: {
            type: newType,
          },
        };
        onChange(newValue);
      }
    },
    [onChange, value]
  );

  const onFormItemValueChange = useCallback(
    (atIndex: number, newItemValue: unknown) => {
      const newValue = [...value];
      const expressionItem = newValue[atIndex];
      if (isFilter(expressionItem)) {
        newValue[atIndex] = {
          filter: {
            ...expressionItem.filter,
            value: newItemValue,
          },
        };
        onChange(newValue);
      }
    },
    [onChange, value]
  );

  const contextValue = useMemo(
    () => ({
      ruleTypeIds,
      services,
    }),
    [ruleTypeIds, services]
  );

  return (
    <AlertsFiltersFormContextProvider value={contextValue}>
      <EuiFlexGroup direction="column" data-test-subj={FILTERS_FORM_SUBJ}>
        <EuiFlexItem>
          <AlertsFiltersFormItem
            type={firstItem.filter.type}
            onTypeChange={(newType) => onFormItemTypeChange(0, newType)}
            value={firstItem.filter.value}
            onValueChange={(newValue) => onFormItemValueChange(0, newValue)}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
        {Boolean(otherItems?.length) && (
          <EuiPanel hasShadow={false} color="subdued">
            <EuiFlexGroup direction="column" gutterSize="s">
              {otherItems.map((item, offsetIndex) => {
                // offsetIndex starts from the second item
                const index = offsetIndex + 1;
                return (
                  <EuiFlexItem key={index}>
                    {isFilter(item) ? (
                      <AlertsFiltersFormItem
                        type={item.filter.type}
                        onTypeChange={(newType) => onFormItemTypeChange(index, newType)}
                        value={item.filter.value}
                        onValueChange={(newValue) => onFormItemValueChange(index, newValue)}
                        isDisabled={isDisabled}
                      />
                    ) : (
                      <Operator operator={item.operator} onDelete={() => deleteOperand(index)} />
                    )}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiPanel>
        )}
        {!maxFilters || otherItems.length >= (maxFilters - 1) * 2 ? (
          <EuiText textAlign="center" size="s" color="subdued">
            <p>{getMaxFiltersNote(maxFilters)}</p>
          </EuiText>
        ) : (
          !lastFilterEmpty && (
            <EuiFlexItem>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                role="group"
                aria-label={ADD_OPERATION_LABEL}
              >
                <EuiFlexItem grow>
                  <EuiHorizontalRule margin="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="plusInCircle"
                    size="xs"
                    onClick={() => addOperand('or')}
                    isDisabled={isDisabled}
                    data-test-subj={ADD_OR_OPERATION_BUTTON_SUBJ}
                  >
                    {OR_OPERATOR}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="plusInCircle"
                    size="xs"
                    onClick={() => addOperand('and')}
                    isDisabled={isDisabled}
                    data-test-subj={ADD_AND_OPERATION_BUTTON_SUBJ}
                  >
                    {AND_OPERATOR}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow>
                  <EuiHorizontalRule margin="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )
        )}
      </EuiFlexGroup>
    </AlertsFiltersFormContextProvider>
  );
};

interface OperatorProps {
  operator: 'and' | 'or';
  onDelete: () => void;
}

const Operator = ({ operator, onDelete }: OperatorProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      css={css`
        border-bottom: ${euiTheme.border.thin};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {operator.toUpperCase()}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          aria-label={DELETE_OPERAND_LABEL}
          onClick={onDelete}
          iconSize="s"
          color="text"
          data-test-subj={DELETE_OPERAND_BUTTON_SUBJ}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
