/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { isValidEsInterval } from '../../../../core_plugins/data/common';
import { useValidation } from '../legacy_imports';

const intervalOptions = [
  {
    label: i18n.translate('timelion.vis.interval.auto', {
      defaultMessage: 'Auto',
    }),
    value: 'auto',
  },
  {
    label: i18n.translate('timelion.vis.interval.second', {
      defaultMessage: '1 second',
    }),
    value: '1s',
  },
  {
    label: i18n.translate('timelion.vis.interval.minute', {
      defaultMessage: '1 minute',
    }),
    value: '1m',
  },
  {
    label: i18n.translate('timelion.vis.interval.hour', {
      defaultMessage: '1 hour',
    }),
    value: '1h',
  },
  {
    label: i18n.translate('timelion.vis.interval.day', {
      defaultMessage: '1 day',
    }),
    value: '1d',
  },
  {
    label: i18n.translate('timelion.vis.interval.week', {
      defaultMessage: '1 week',
    }),
    value: '1w',
  },
  {
    label: i18n.translate('timelion.vis.interval.month', {
      defaultMessage: '1 month',
    }),
    value: '1M',
  },
  {
    label: i18n.translate('timelion.vis.interval.year', {
      defaultMessage: '1 year',
    }),
    value: '1y',
  },
];

interface TimelionIntervalProps {
  value: string;
  setValue(value: string): void;
  setValidity(valid: boolean): void;
}

function TimelionInterval({ value, setValue, setValidity }: TimelionIntervalProps) {
  const onCustomInterval = useCallback(
    (customValue: string) => {
      setValue(customValue.trim());
    },
    [setValue]
  );

  const onChange = useCallback(
    (opts: Array<EuiComboBoxOptionProps<string>>) => {
      setValue((opts[0] && opts[0].value) || '');
    },
    [setValue]
  );

  const selectedOptions = useMemo(
    () => [intervalOptions.find(op => op.value === value) || { label: value, value }],
    [value]
  );

  const isValid = intervalOptions.some(int => int.value === value) || isValidEsInterval(value);

  useValidation(setValidity, isValid);

  return (
    <EuiFormRow
      compressed
      fullWidth
      helpText={i18n.translate('timelion.vis.selectIntervalHelpText', {
        defaultMessage:
          'Select an option or create a custom value. Examples: 30s, 20m, 24h, 2d, 1w, 1M',
      })}
      isInvalid={!isValid}
      error={
        !isValid &&
        i18n.translate('timelion.vis.invalidIntervalErrorMessage', {
          defaultMessage: 'Invalid interval format.',
        })
      }
      label={i18n.translate('timelion.vis.intervalLabel', {
        defaultMessage: 'Interval',
      })}
    >
      <EuiComboBox
        compressed
        fullWidth
        isInvalid={!isValid}
        onChange={onChange}
        onCreateOption={onCustomInterval}
        options={intervalOptions}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        placeholder={i18n.translate('timelion.vis.selectIntervalPlaceholder', {
          defaultMessage: 'Select an interval',
        })}
      />
    </EuiFormRow>
  );
}

export { TimelionInterval };
