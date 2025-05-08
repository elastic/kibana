/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import type { HttpStart } from '@kbn/core-http-browser';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import { RuleTypeSolution } from '@kbn/alerting-types';
import { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { SOLUTION_SELECTOR_SUBJ, SUPPORTED_SOLUTIONS } from '../constants';
import {
  RULE_TYPES_LOAD_ERROR_MESSAGE,
  SOLUTION_SELECTOR_LABEL,
  SOLUTION_SELECTOR_PLACEHOLDER,
} from '../translations';

export interface AlertsSolutionSelectorProps {
  solution?: RuleTypeSolution;
  onSolutionChange: (newSolution: RuleTypeSolution) => void;
  services: {
    http: HttpStart;
  };
}

const featuresIcons: Record<string, string> = {
  stack: 'managementApp',
  security: 'logoSecurity',
  observability: 'logoObservability',
};

const getAvailableSolutions = (ruleTypes: InternalRuleType[]) => {
  const solutions = new Set<RuleTypeSolution>();

  for (const ruleType of ruleTypes) {
    // We want to filter out solutions we do not support in case someone
    // abuses the solution rule type attribute
    if (SUPPORTED_SOLUTIONS.includes(ruleType.solution)) {
      solutions.add(ruleType.solution);
    }
  }

  if (solutions.has('stack') && solutions.has('observability')) {
    solutions.delete('stack');
  }

  return solutions;
};

/**
 * A solution selector for segregated rule types authorization
 * When only one solution is available, it will be selected by default
 * and the picker will be hidden.
 * When Observability/Stack and Security rule types are available
 * the selector will be shown, hiding Stack under Observability.
 * Stack is shown only when it's the unique alternative to Security
 * (i.e. in Security serverless projects).
 */
export const AlertsSolutionSelector = ({
  solution,
  onSolutionChange,
  services: { http },
}: AlertsSolutionSelectorProps) => {
  const { data: ruleTypes, isLoading, isError } = useGetInternalRuleTypesQuery({ http });
  const availableSolutions = useMemo(() => getAvailableSolutions(ruleTypes ?? []), [ruleTypes]);
  const options = useMemo<Array<EuiSuperSelectOption<RuleTypeSolution>>>(() => {
    return Array.from(availableSolutions.values()).map((sol) => ({
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

  if (options.length < 2) {
    if (options.length === 1) {
      // Select the only available solution and
      // don't show the selector
      onSolutionChange(options[0].value);
    }
    return null;
  }

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
        isLoading={isLoading}
        isInvalid={isError}
        placeholder={SOLUTION_SELECTOR_PLACEHOLDER}
        options={options}
        valueOfSelected={solution}
        onChange={(newSol) => onSolutionChange(newSol)}
        fullWidth
      />
    </EuiFormRow>
  );
};
