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
  EuiText,
  useEuiTheme,
  EuiPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { AlertsFiltersFormContextProvider } from '../contexts/alerts_filters_form_context';
import {
  AlertsFiltersExpression,
  AlertsFiltersFormItemType,
  AlertsFilter,
  AlertsFiltersExpressionOperator,
} from '../types';
import {
  ADD_OPERATION_LABEL,
  AND_OPERATOR,
  DELETE_OPERAND_LABEL,
  OR_OPERATOR,
} from '../translations';
import { AlertsFiltersFormItem } from './alerts_filters_form_item';
import { isFilter } from '../utils';
import {
  ADD_AND_OPERATION_BUTTON_SUBJ,
  ADD_OR_OPERATION_BUTTON_SUBJ,
  DELETE_OPERAND_BUTTON_SUBJ,
} from '../constants';

export interface AlertsFiltersFormProps {
  ruleTypeIds: string[];
  value?: AlertsFiltersExpression;
  onChange: (newValue: AlertsFiltersExpression) => void;
  isDisabled?: boolean;
  services: {
    http: HttpStart;
    notifications: NotificationsStart;
  };
}

// This ensures that the form is initialized with an initially empty "Filter by" selector
const DEFAULT_VALUE: AlertsFiltersExpression = [{ filter: {} }];

/**
 * A form to build boolean expressions of filters for alerts searches
 */
export const AlertsFiltersForm = ({
  ruleTypeIds,
  value = DEFAULT_VALUE,
  onChange,
  isDisabled = false,
  services,
}: AlertsFiltersFormProps) => {
  const [firstItem, ...otherItems] = value as [
    {
      filter: AlertsFilter;
    },
    ...AlertsFiltersExpression
  ];

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
      <EuiFlexGroup direction="column">
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
