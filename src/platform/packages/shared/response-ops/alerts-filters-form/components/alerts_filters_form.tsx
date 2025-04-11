/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { AlertsFiltersFormContextProvider } from '../contexts/alerts_filters_form_context';
import {
  AlertsFiltersExpression,
  AlertsFiltersFormItemType,
  AlertsFilter,
  FlattenedExpressionItem,
} from '../types';
import {
  ADD_OPERATION_LABEL,
  AND_OPERATOR,
  DELETE_OPERAND_LABEL,
  OR_OPERATOR,
} from '../translations';
import { AlertsFiltersFormItem } from './alerts_filters_form_item';
import {
  flattenFiltersExpression,
  isFlatExpressionFilter,
  reconstructFiltersExpression,
} from '../utils/filters_expression';
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
const DEFAULT_VALUE: AlertsFiltersExpression = {
  operator: 'and',
  operands: [{}],
};

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
  // Intermediate flattened expression state
  const [flatExpression, setFlatExpression] = useState(flattenFiltersExpression(value));
  const [firstItem, ...otherItems] = flatExpression as [
    {
      filter: AlertsFilter;
    },
    ...FlattenedExpressionItem[]
  ];

  useDeepCompareEffect(() => {
    // From tree to flat (using deep comparison to avoid infinite loops)
    setFlatExpression(flattenFiltersExpression(value));
  }, [value]);

  useEffect(() => {
    // From flat to tree
    onChange(reconstructFiltersExpression(flatExpression));
  }, [flatExpression, onChange]);

  const addOperand = useCallback((operator: AlertsFiltersExpression['operator']) => {
    setFlatExpression((oldExpression) => [
      ...oldExpression,
      {
        operator,
      },
      { filter: {} },
    ]);
  }, []);

  const deleteOperand = useCallback((atIndex: number) => {
    setFlatExpression((oldExpression) => {
      // Remove two items: the operator and the following filter
      oldExpression.splice(atIndex, 2);
      return [...oldExpression];
    });
  }, []);

  const onFormItemTypeChange = useCallback(
    (atIndex: number, newType: AlertsFiltersFormItemType) => {
      setFlatExpression((oldExpression) => {
        const expressionItem = oldExpression[atIndex];
        if (isFlatExpressionFilter(expressionItem)) {
          oldExpression[atIndex] = {
            filter: {
              type: newType,
            },
          };
          return [...oldExpression];
        }
        return oldExpression;
      });
    },
    []
  );

  const onFormItemValueChange = useCallback((atIndex: number, newValue: unknown) => {
    setFlatExpression((oldExpression) => {
      const expressionItem = oldExpression[atIndex];
      if (isFlatExpressionFilter(expressionItem)) {
        oldExpression[atIndex] = {
          filter: {
            ...expressionItem.filter,
            value: newValue,
          },
        };
        return [...oldExpression];
      }
      return oldExpression;
    });
  }, []);

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
                    {'operator' in item ? (
                      <Operator operator={item.operator} onDelete={() => deleteOperand(index)} />
                    ) : (
                      <AlertsFiltersFormItem
                        type={item.filter.type}
                        onTypeChange={(newType) => onFormItemTypeChange(index, newType)}
                        value={item.filter.value}
                        onValueChange={(newValue) => onFormItemValueChange(index, newValue)}
                        isDisabled={isDisabled}
                      />
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
