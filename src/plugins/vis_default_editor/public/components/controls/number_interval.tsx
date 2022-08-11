/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import React, { useEffect, useCallback } from 'react';

import {
  EuiFieldNumber,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  EuiSwitchProps,
  EuiFieldNumberProps,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UI_SETTINGS } from '@kbn/data-plugin/public';

import { AggParamEditorProps } from '../agg_param_props';

const label = (
  <>
    <FormattedMessage
      id="visDefaultEditor.controls.numberInterval.minimumIntervalLabel"
      defaultMessage="Minimum interval"
    />{' '}
    <EuiIconTip
      position="right"
      content={
        <FormattedMessage
          id="visDefaultEditor.controls.numberInterval.minimumIntervalTooltip"
          defaultMessage="Interval will be automatically scaled in the event that the provided value creates more buckets than specified by Advanced Setting's {histogramMaxBars}"
          values={{ histogramMaxBars: UI_SETTINGS.HISTOGRAM_MAX_BARS }}
        />
      }
      type="questionInCircle"
    />
  </>
);

const autoInterval = 'auto';
const isAutoInterval = (value: unknown) => value === autoInterval;

const selectIntervalPlaceholder = i18n.translate(
  'visDefaultEditor.controls.numberInterval.selectIntervalPlaceholder',
  {
    defaultMessage: 'Enter an interval',
  }
);
const autoIntervalIsUsedPlaceholder = i18n.translate(
  'visDefaultEditor.controls.numberInterval.autoInteralIsUsed',
  {
    defaultMessage: 'Auto interval is used',
  }
);
const useAutoIntervalLabel = i18n.translate('visDefaultEditor.controls.useAutoInterval', {
  defaultMessage: 'Use auto interval',
});

function NumberIntervalParamEditor({
  agg,
  editorConfig,
  showValidation,
  value,
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<string | undefined>) {
  const field = agg.getField();
  const fieldSupportsAuto = !field || field.type === 'number';
  const isAutoChecked = fieldSupportsAuto && isAutoInterval(value);
  const base: number = get(editorConfig, 'interval.base') as number;
  const min = base || 0;
  const isValid = value !== '' && value !== undefined && (isAutoChecked || Number(value) >= min);

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  const onChange: EuiFieldNumberProps['onChange'] = useCallback(
    ({ target }) => setValue(isNaN(target.valueAsNumber) ? '' : target.valueAsNumber),
    [setValue]
  );

  const onAutoSwitchChange: EuiSwitchProps['onChange'] = useCallback(
    (e) => {
      const isAutoSwitchChecked = e.target.checked;

      setValue(isAutoSwitchChecked ? autoInterval : '');
    },
    [setValue]
  );

  return (
    <EuiFormRow
      display="rowCompressed"
      label={label}
      fullWidth={true}
      isInvalid={showValidation && !isValid}
      helpText={get(editorConfig, 'interval.help')}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} direction={'column'}>
        <EuiFlexItem>
          <EuiSwitch
            label={useAutoIntervalLabel}
            onChange={onAutoSwitchChange}
            checked={isAutoChecked}
            compressed
            disabled={!fieldSupportsAuto}
            data-test-subj={`visEditorIntervalSwitch${agg.id}`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            value={!isAutoChecked ? value : ''}
            min={min}
            step={base || 'any'}
            data-test-subj={`visEditorInterval${agg.id}`}
            isInvalid={showValidation && !isValid}
            onChange={onChange}
            onBlur={setTouched}
            disabled={isAutoChecked}
            fullWidth
            compressed
            placeholder={isAutoChecked ? autoIntervalIsUsedPlaceholder : selectIntervalPlaceholder}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

export { NumberIntervalParamEditor };
