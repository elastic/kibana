/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTextArea, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';

const isValidRegex = (expression: string): boolean => {
  if (!expression) return true;
  try {
    new RegExp(expression);
    return true;
  } catch {
    return false;
  }
};

interface RegexExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  invertMatch: boolean;
  onInvertMatchChange: (checked: boolean) => void;
}

export const RegexExpressionInput = ({
  value,
  onChange,
  invertMatch,
  onInvertMatchChange,
}: RegexExpressionInputProps) => {
  const isInvalid = !isValidRegex(value);

  return (
    <>
      <EuiFormRow
        data-test-subj="filterRegex-row"
        isInvalid={isInvalid}
        error={
          isInvalid
            ? i18n.translate('console.outputFilter.regex.invalidExpression', {
                defaultMessage: 'Invalid expression',
              })
            : undefined
        }
        fullWidth
      >
        <EuiTextArea
          data-test-subj="filterRegex"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          isInvalid={isInvalid}
          placeholder={i18n.translate('console.outputFilter.regex.placeholder', {
            defaultMessage: 'Regular expression',
          })}
          rows={3}
          resize="vertical"
          fullWidth
        />
      </EuiFormRow>

      <EuiSpacer size="s" />
      <EuiSwitch
        data-test-subj="invertFilter"
        label={i18n.translate('console.outputFilter.regex.invertMatch', {
          defaultMessage: 'Invert match',
        })}
        checked={invertMatch}
        onChange={(e) => onInvertMatchChange(e.target.checked)}
        compressed
      />
    </>
  );
};
