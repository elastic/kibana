/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { firstFieldOption, getTimeFieldOptions } from '../utils';

interface Props {
  value?: string;
  onChange: (value: string) => void;
  fields: Array<{ name: string; type: string }>;
}

export const TimeFieldSelect = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, fields }, ref) => {
    const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

    useEffect(() => {
      if (fields.length) {
        const newTimeFieldOptions = getTimeFieldOptions(fields);
        setTimeFieldOptions([firstFieldOption, ...newTimeFieldOptions]);
        if (!newTimeFieldOptions.find((option) => option.value === value)) {
          onChange('');
        }
      }
    }, [fields, value, onChange]);

    return (
      <EuiSelect
        options={timeFieldOptions}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={i18n.translate('xpack.esqlRuleForm.timeFieldSelect.ariaLabel', {
          defaultMessage: 'Time field',
        })}
        inputRef={ref}
      />
    );
  }
);
