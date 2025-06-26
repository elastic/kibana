/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RawValue, SerializedValue, deserializeField } from '@kbn/data-plugin/common';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { ColorMapping } from '../../config';
import { ColorRule, RuleMatch, RuleMatchRaw } from '../../config/types';
import { ColorAssignmentMatcher } from '../../color/color_assignment_matcher';
import { DuplicateWarning } from './duplicate_warning';
import { getValueKey } from '../../color/utils';

export const isNotNull = <T,>(value: T | null): value is NonNullable<T> => value !== null;

export const Match: React.FC<{
  index: number;
  rules: ColorMapping.ColorRule[];
  updateRules: (rule: ColorMapping.ColorRule[]) => void;
  categories: SerializedValue[];
  specialTokens: Map<unknown, string>;
  formatter?: IFieldFormat;
  allowCustomMatch?: boolean;
  assignmentMatcher: ColorAssignmentMatcher;
}> = ({
  index,
  rules,
  updateRules,
  categories,
  specialTokens,
  formatter,
  allowCustomMatch = false,
  assignmentMatcher,
}) => {
  const getOptionForRawValue = getOptionForRawValueFn(formatter);
  const availableOptions: Array<EuiComboBoxOptionOption<string>> = [];

  // Map option key to their raw value
  const rawCategoryValueMap = categories.reduce<Map<string, RawValue>>(
    (acc, value: SerializedValue) => {
      const option = getOptionForRawValue(value);
      availableOptions.push(option);
      acc.set(option.key, value);
      return acc;
    },
    new Map()
  );
  const selectedOptions = rules
    .map<EuiComboBoxOptionOption<string> | null>((rule) => {
      switch (rule.type) {
        case 'raw': {
          const rawValue = deserializeField(rule.value);
          const hasDuplicate = assignmentMatcher.hasDuplicate(rawValue);
          const option = getOptionForRawValue(rule.value);
          rawCategoryValueMap.set(option.key, rule.value);
          return {
            ...option,
            append: hasDuplicate && <DuplicateWarning />,
          };
        }
        case 'match': {
          const key = rule.matchCase ? rule.pattern : rule.pattern.toLowerCase();
          const hasDuplicate = assignmentMatcher.hasDuplicate(key); // non-exhaustive for partial word match

          return {
            label: specialTokens.get(rule.pattern) ?? rule.pattern,
            key: rule.pattern,
            append: hasDuplicate && <DuplicateWarning />,
          };
        }
        case 'regex': {
          // Note: Only basic placeholder logic, not used or fully tested
          const hasDuplicate = false; // need to use exhaustive search

          return {
            label: rule.pattern,
            key: rule.pattern,
            append: hasDuplicate && <DuplicateWarning />,
          };
        }
        default:
          return null;
      }
    })
    .filter(isNotNull);

  return (
    <EuiFlexItem style={{ minWidth: 1, width: 1 }}>
      <EuiComboBox
        isClearable
        data-test-subj={`lns-colorMapping-assignmentsItem${index}`}
        fullWidth={true}
        aria-label={i18n.translate('coloring.colorMapping.assignments.autoAssignedTermAriaLabel', {
          defaultMessage:
            "This color will be automatically assigned to the first term that doesn't match with all the other assignments",
        })}
        placeholder={i18n.translate(
          'coloring.colorMapping.assignments.autoAssignedTermPlaceholder',
          {
            defaultMessage: 'Auto assigning term',
          }
        )}
        options={availableOptions}
        selectedOptions={selectedOptions}
        onChange={(newOptions) => {
          updateRules(
            newOptions.reduce<ColorRule[]>((acc, { key = null }) => {
              if (key !== null) {
                if (rawCategoryValueMap.has(key)) {
                  acc.push({
                    type: 'raw',
                    value: rawCategoryValueMap.get(key),
                  } satisfies RuleMatchRaw);
                } else {
                  acc.push({
                    type: 'match',
                    pattern: key,
                    matchCase: true,
                    matchEntireWord: true,
                  } satisfies RuleMatch);
                }
              }
              return acc;
            }, [])
          );
        }}
        optionMatcher={({ option, normalizedSearchValue }) => {
          return (
            String(option.value ?? '').includes(normalizedSearchValue) ||
            option.label.includes(normalizedSearchValue)
          );
        }}
        onCreateOption={
          allowCustomMatch
            ? (label) => {
                return updateRules([
                  ...rules,
                  {
                    type: 'match',
                    pattern: label,
                    matchCase: true,
                    matchEntireWord: true,
                  } satisfies RuleMatch,
                ]);
              }
            : undefined
        }
        isCaseSensitive
        compressed
      />
    </EuiFlexItem>
  );
};

function getOptionForRawValueFn(fieldFormat?: IFieldFormat) {
  const formatter = fieldFormat?.convert.bind(fieldFormat) ?? String;
  return (serializedValue: unknown) => {
    const rawValue = deserializeField(serializedValue);
    const key = getValueKey(rawValue);
    return {
      key,
      value: typeof rawValue === 'number' ? key : undefined,
      label: formatter(rawValue),
    } satisfies EuiComboBoxOptionOption<string>;
  };
}
