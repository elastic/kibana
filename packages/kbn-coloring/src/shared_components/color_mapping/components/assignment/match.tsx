/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiComboBox, EuiFlexItem } from '@elastic/eui';
import { ColorMapping } from '../../config';
// TODO: move this outside or configurable
export const MULTI_FIELD_VALUES_SEPARATOR = ' › ';

export const Match: React.FC<{
  index: number;
  editable: boolean;
  rule:
    | ColorMapping.RuleAuto
    | ColorMapping.RuleMatchExactly
    | ColorMapping.RuleMatchExactlyCI
    | ColorMapping.RuleRegExp;
  updateValue: (values: Array<string | string[]>) => void;
  options: Array<string | string[]>;
  specialTokens: Map<unknown, string>;
}> = ({ index, rule, updateValue, editable, options, specialTokens }) => {
  const selectedOptions =
    rule.type === 'auto'
      ? []
      : typeof rule.values === 'string'
      ? [{ label: rule.values, value: rule.values }]
      : rule.values.map((value) => {
          const ruleValues = Array.isArray(value) ? value : [value];
          return {
            label: ruleValues
              .map((v) => specialTokens.get(v) ?? v)
              .join(MULTI_FIELD_VALUES_SEPARATOR),
            value,
          };
        });

  const convertedOptions = options.map((value) => {
    const ruleValues = Array.isArray(value) ? value : [value];
    return {
      label: ruleValues.map((v) => specialTokens.get(v) ?? v).join(MULTI_FIELD_VALUES_SEPARATOR),
      value,
    };
  });

  return (
    <EuiFlexItem style={{ minWidth: 1 }}>
      <EuiComboBox
        data-test-subj={`lns-colorMapping-assignmentsItem${index}`}
        isDisabled={!editable}
        fullWidth={true}
        aria-label="Accessible screen reader label"
        placeholder="auto assigned term"
        options={convertedOptions}
        selectedOptions={selectedOptions}
        onChange={(changedOptions) => {
          updateValue(
            changedOptions.reduce<Array<string | string[]>>((acc, option) => {
              if (option.value !== undefined) {
                acc.push(option.value);
              }
              return acc;
            }, [])
          );
        }}
        onCreateOption={(e) => {
          const label = e.trim();
          if (
            selectedOptions.findIndex((option) => option.label.trim().toLowerCase() === label) ===
            -1
          ) {
            updateValue([...selectedOptions, { label, value: label }].map((d) => d.value));
          }
        }}
        isClearable={false}
      />
    </EuiFlexItem>
  );
};
