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
import { checkScript } from '@elastic/micro-jq';
import { i18n } from '@kbn/i18n';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { useOutputFilterActionContext, useOutputFilterReadContext } from '../../../../contexts/output_filter_context';

export const JqExpressionInput = () => {
  const { expression } = useOutputFilterReadContext();
  const { setExpression } = useOutputFilterActionContext();
  const [localValue, setLocalValue] = useState(expression);

  const debouncedSetExpression = useMemo(() => debounce(setExpression, 100), [setExpression]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      debouncedSetExpression(val);
    },
    [debouncedSetExpression]
  );

  const isInvalid = localValue.length > 0 && !checkScript(localValue);

  return (
    <>
      <EuiFormRow
        data-test-subj="filterJq-row"
        isInvalid={isInvalid}
        error={
          isInvalid
            ? i18n.translate('console.outputFilter.jq.invalidExpression', {
                defaultMessage: 'Invalid expression — only a subset of the JQ language is supported',
              })
            : undefined
        }
        fullWidth
      >
        <EuiTextArea
          data-test-subj="filterJq"
          value={localValue}
          onChange={handleChange}
          isInvalid={isInvalid}
          placeholder={i18n.translate('console.outputFilter.jq.placeholder', {
            defaultMessage: 'JQ expression',
          })}
          rows={3}
          resize="vertical"
          fullWidth
        />
      </EuiFormRow>

    </>
  );
};
