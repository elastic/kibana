/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiTextArea,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { useOutputFilterActionContext, useOutputFilterReadContext } from '../../../../contexts/output_filter_context';

const isValidRegex = (expression: string): boolean => {
  if (!expression) return true;
  try {
    new RegExp(expression);
    return true;
  } catch {
    return false;
  }
};

export const RegexExpressionInput = () => {
  const { expression, invertMatch } = useOutputFilterReadContext();
  const { setExpression, setInvertMatch } = useOutputFilterActionContext();
  const [localValue, setLocalValue] = useState(expression);

  const debouncedSetExpression = useMemo(() => debounce(setExpression, 50), [setExpression]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      debouncedSetExpression(val);
    },
    [debouncedSetExpression]
  );

  const isInvalid = !isValidRegex(localValue);

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
          value={localValue}
          onChange={handleChange}
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
        onChange={(e) => setInvertMatch(e.target.checked)}
        compressed
      />

    </>
  );
};
