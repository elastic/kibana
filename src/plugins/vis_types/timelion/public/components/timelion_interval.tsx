/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { search } from '@kbn/data-plugin/public';
const { isValidEsInterval } = search.aggs;
import { useValidation } from '@kbn/vis-default-editor-plugin/public';

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
    (opts: Array<EuiComboBoxOptionOption<string>>) => {
      setValue((opts[0] && opts[0].value) || '');
    },
    [setValue]
  );

  const selectedOptions = useMemo(
    () => [intervalOptions.find((op) => op.value === value) || { label: value, value }],
    [value]
  );

  const isValid = intervalOptions.some((int) => int.value === value) || isValidEsInterval(value);

  useValidation(setValidity, isValid);

  return (
    <EuiFormRow
      display="rowCompressed"
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
        data-test-subj="timelionIntervalComboBox"
      />
    </EuiFormRow>
  );
}

export { TimelionInterval };
