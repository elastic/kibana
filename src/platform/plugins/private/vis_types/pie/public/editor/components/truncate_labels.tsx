/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldNumber, EuiIconTip } from '@elastic/eui';

export interface TruncateLabelsOptionProps {
  disabled?: boolean;
  value?: number | null;
  setValue: (paramName: 'truncate', value: null | number) => void;
}

function TruncateLabelsOption({ disabled, value = null, setValue }: TruncateLabelsOptionProps) {
  const onChange = (ev: ChangeEvent<HTMLInputElement>) =>
    setValue('truncate', ev.target.value === '' ? null : parseFloat(ev.target.value));

  return (
    <EuiFormRow
      label={i18n.translate('visTypePie.controls.truncateLabel', {
        defaultMessage: 'Truncate',
      })}
      fullWidth
      display="rowCompressed"
      labelAppend={
        <EuiIconTip
          content={i18n.translate('visTypePie.controls.truncateTooltip', {
            defaultMessage: 'Number of characters for labels positioned outside the chart.',
          })}
          position="top"
          type="iInCircle"
          color="subdued"
        />
      }
    >
      <EuiFieldNumber
        data-test-subj="pieLabelTruncateInput"
        disabled={disabled}
        value={value || ''}
        onChange={onChange}
        fullWidth
        compressed
      />
    </EuiFormRow>
  );
}

export { TruncateLabelsOption };
