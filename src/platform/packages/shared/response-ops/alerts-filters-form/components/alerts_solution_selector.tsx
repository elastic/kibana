/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { forwardRef, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { RuleTypeSolution } from '@kbn/alerting-types';
import { SOLUTION_SELECTOR_SUBJ } from '../constants';
import {
  RULE_TYPES_LOAD_ERROR_MESSAGE,
  SOLUTION_SELECTOR_LABEL,
  SOLUTION_SELECTOR_PLACEHOLDER,
} from '../translations';

export interface AlertsSolutionSelectorProps {
  availableSolutions?: RuleTypeSolution[];
  isLoading?: boolean;
  isError?: boolean;
  solution?: RuleTypeSolution;
  onSolutionChange: (newSolution: RuleTypeSolution) => void;
}

const featuresIcons: Record<string, string> = {
  stack: 'managementApp',
  security: 'logoSecurity',
  observability: 'logoObservability',
};

export const AlertsSolutionSelector = forwardRef<
  EuiSuperSelect<RuleTypeSolution>,
  AlertsSolutionSelectorProps
>(({ availableSolutions, isLoading, isError, solution, onSolutionChange }, ref) => {
  const options = useMemo<Array<EuiSuperSelectOption<RuleTypeSolution>>>(() => {
    if (!availableSolutions) {
      return [];
    }
    return availableSolutions.map((sol) => ({
      value: sol,
      inputDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={featuresIcons[sol]} />
          </EuiFlexItem>
          <EuiFlexItem>{capitalize(sol)}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    }));
  }, [availableSolutions]);

  return (
    <EuiFormRow
      label={SOLUTION_SELECTOR_LABEL}
      isInvalid={isError}
      isDisabled={isError}
      error={isError ? RULE_TYPES_LOAD_ERROR_MESSAGE : undefined}
      fullWidth
      data-test-subj={SOLUTION_SELECTOR_SUBJ}
    >
      <EuiSuperSelect
        ref={ref}
        isLoading={isLoading}
        isInvalid={isError}
        placeholder={SOLUTION_SELECTOR_PLACEHOLDER}
        options={options}
        valueOfSelected={solution}
        onChange={(newSol) => onSolutionChange(newSol)}
        fullWidth
        compressed
        popoverProps={{
          repositionOnScroll: true,
          ownFocus: true,
        }}
      />
    </EuiFormRow>
  );
});
