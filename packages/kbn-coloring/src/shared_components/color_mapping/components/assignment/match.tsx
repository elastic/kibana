/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiComboBox, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MULTI_FIELD_KEY_SEPARATOR } from '@kbn/data-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import { ColorMapping } from '../../config';

export const Match: React.FC<{
  index: number;
  rule:
    | ColorMapping.RuleAuto
    | ColorMapping.RuleMatchExactly
    | ColorMapping.RuleMatchExactlyCI
    | ColorMapping.RuleRegExp;
  updateValue: (values: Array<string | string[]>) => void;
  options: Array<string | string[]>;
  specialTokens: Map<unknown, string>;
  assignmentValuesCounter: Map<string | string[], number>;
}> = ({ index, rule, updateValue, options, specialTokens, assignmentValuesCounter }) => {
  const duplicateWarning = i18n.translate(
    'coloring.colorMapping.assignments.duplicateCategoryWarning',
    {
      defaultMessage:
        'This category has already been assigned a different color. Only the first matching assignment will be used.',
    }
  );
  const selectedOptions =
    rule.type === 'auto'
      ? []
      : typeof rule.values === 'string'
      ? [
          {
            label: rule.values,
            value: rule.values,
            append:
              (assignmentValuesCounter.get(rule.values) ?? 0) > 1 ? (
                <EuiToolTip position="bottom" content={duplicateWarning}>
                  <EuiIcon size="s" type="warning" color={euiThemeVars.euiColorWarningText} />
                </EuiToolTip>
              ) : undefined,
          },
        ]
      : rule.values.map((value) => {
          const ruleValues = Array.isArray(value) ? value : [value];
          return {
            label: ruleValues.map((v) => specialTokens.get(v) ?? v).join(MULTI_FIELD_KEY_SEPARATOR),
            value,
            append:
              (assignmentValuesCounter.get(value) ?? 0) > 1 ? (
                <EuiToolTip position="bottom" content={duplicateWarning}>
                  <EuiIcon size="s" type="warning" color={euiThemeVars.euiColorWarningText} />
                </EuiToolTip>
              ) : undefined,
          };
        });

  const convertedOptions = options.map((value) => {
    const ruleValues = Array.isArray(value) ? value : [value];
    return {
      label: ruleValues.map((v) => specialTokens.get(v) ?? v).join(MULTI_FIELD_KEY_SEPARATOR),
      value,
    };
  });

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
        onCreateOption={(label) => {
          if (selectedOptions.findIndex((option) => option.label === label) === -1) {
            updateValue([...selectedOptions, { label, value: label }].map((d) => d.value));
          }
        }}
        isCaseSensitive
        compressed
      />
    </EuiFlexItem>
  );
};
