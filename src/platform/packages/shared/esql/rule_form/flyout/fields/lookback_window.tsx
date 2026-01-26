/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getDurationUnitValue, getDurationNumberInItsUnit } from '../utils';
import { getTimeOptions } from '../utils';

const INTEGER_REGEX = /^[1-9][0-9]*$/;
const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

const LOOKBACK_WINDOW_TITLE_PREFIX = i18n.translate(
  'xpack.esqlRuleForm.lookbackWindow.titlePrefix',
  {
    defaultMessage: 'Last',
  }
);

const LOOKBACK_WINDOW_UNIT_LABEL = i18n.translate('xpack.esqlRuleForm.lookbackWindow.unitLabel', {
  defaultMessage: 'Unit',
});

interface Props {
  value: string;
  onChange: (value: string) => void;
  errors?: string;
}

export const LookbackWindow: React.FC<Props> = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, errors }, ref) => {
    const intervalNumber = useMemo(() => {
      return getDurationNumberInItsUnit(value ?? 1);
    }, [value]);

    const intervalUnit = useMemo(() => {
      return getDurationUnitValue(value);
    }, [value]);

    const onIntervalNumberChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        if (INTEGER_REGEX.test(val)) {
          const parsedValue = parseInt(val, 10);
          onChange(`${parsedValue}${intervalUnit}`);
        }
      },
      [intervalUnit, onChange]
    );

    const onIntervalUnitChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(`${intervalNumber}${e.target.value}`);
      },
      [intervalNumber, onChange]
    );

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (INVALID_KEYS.includes(e.key)) {
        e.preventDefault();
      }
    }, []);

    return (
      <EuiFormRow
        fullWidth
        data-test-subj="lookbackWindow"
        display="rowCompressed"
        isInvalid={!!errors}
        error={errors}
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              fullWidth
              prepend={[LOOKBACK_WINDOW_TITLE_PREFIX]}
              isInvalid={!!errors}
              value={intervalNumber}
              name="interval"
              data-test-subj="lookbackWindowNumberInput"
              onChange={onIntervalNumberChange}
              onKeyDown={onKeyDown}
              id="lookbackWindowNumberInput"
              itemID="lookbackWindowNumberInput"
              aria-label={LOOKBACK_WINDOW_TITLE_PREFIX}
              inputRef={ref}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              value={intervalUnit}
              options={getTimeOptions(intervalNumber ?? 1)}
              onChange={onIntervalUnitChange}
              data-test-subj="lookbackWindowUnitInput"
              aria-label={LOOKBACK_WINDOW_UNIT_LABEL}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);
