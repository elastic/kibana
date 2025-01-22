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
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

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
      label={i18n.translate('visTypeXy.controls.truncateLabel', {
        defaultMessage: 'Truncate',
      })}
      fullWidth
      display="rowCompressed"
    >
      <EuiFieldNumber
        data-test-subj="xyLabelTruncateInput"
        disabled={disabled}
        value={value === null ? '' : value}
        onChange={onChange}
        fullWidth
        compressed
      />
    </EuiFormRow>
  );
}

export { TruncateLabelsOption };
