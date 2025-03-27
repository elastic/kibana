/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
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
  reconstructFiltersExpression,
} from '../utils/filters_expression';
import {
  ADD_AND_OPERATION_BUTTON_SUBJ,
  ADD_OR_OPERATION_BUTTON_SUBJ,
  DELETE_OPERAND_BUTTON_SUBJ,
} from '../constants';

export interface AlertsFiltersFormProps {
  value?: AlertsFiltersExpression;
  onChange: (newValue: AlertsFiltersExpression) => void;
  isDisabled?: boolean;
}

const DEFAULT_VALUE: AlertsFiltersExpression = {
  operator: 'and',
  operands: [{}],
};

/**
 * A form to build boolean expressions of filters for alerts searches
 */
export const AlertsFiltersForm = ({
  value = DEFAULT_VALUE,
  onChange,
  isDisabled = false,
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
      oldExpression.splice(atIndex, 2);
      return [...oldExpression];
    });
  }, []);

  const onFormItemTypeChange = useCallback(
    (atIndex: number, newType: AlertsFiltersFormItemType) => {
      setFlatExpression((oldExpression) => {
        if ('filter' in oldExpression[atIndex]) {
          oldExpression[atIndex] = {
            filter: {
              ...(oldExpression[atIndex] as { filter: AlertsFilter }).filter,
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
      if ('filter' in oldExpression[atIndex]) {
        oldExpression[atIndex] = {
          filter: {
            ...(oldExpression[atIndex] as { filter: AlertsFilter }).filter,
            value: newValue,
          },
        };
        return [...oldExpression];
      }
      return oldExpression;
    });
  }, []);

  return (
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
            <Separator />
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
            <Separator />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const Separator = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        width: 100%;
        border-bottom: ${euiTheme.border.thin};
      `}
    />
  );
};

interface OperatorProps {
  operator: 'and' | 'or';
  onDelete: () => void;
}

const Operator = ({ operator, onDelete }: OperatorProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
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
    </>
  );
};
