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

import { get } from 'lodash';
import React, { useEffect, useCallback, useState } from 'react';

import {
  EuiFieldNumber,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  EuiSwitchProps,
  EuiFieldNumberProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { UI_SETTINGS } from '../../../../data/public';

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
const isAutoInterval = (value: unknown) => Boolean(value && value === autoInterval);

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

function NumberIntervalParamEditor({
  agg,
  editorConfig,
  showValidation,
  value,
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<string | undefined>) {
  const [autoChecked, setAutoChecked] = useState(isAutoInterval(value));
  const base: number = get(editorConfig, 'interval.base') as number;
  const min = base || 0;
  const isValid = value !== undefined && (isAutoInterval(value) || Number(value) >= min);

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  const onChange: EuiFieldNumberProps['onChange'] = useCallback(
    ({ target }) => setValue(isNaN(target.valueAsNumber) ? undefined : target.valueAsNumber),
    [setValue]
  );

  const onAutoSwitchChange: EuiSwitchProps['onChange'] = useCallback(
    (e) => {
      const isAutoSwitchChecked = e.target.checked;

      setAutoChecked(isAutoSwitchChecked);
      setValue(isAutoSwitchChecked ? autoInterval : undefined);
    },
    [setAutoChecked, setValue]
  );

  return (
    <EuiFormRow
      compressed
      label={label}
      fullWidth={true}
      isInvalid={showValidation && !isValid}
      helpText={get(editorConfig, 'interval.help')}
    >
      <EuiFieldNumber
        value={value === undefined ? '' : value}
        min={min}
        step={base || 'any'}
        data-test-subj={`visEditorInterval${agg.id}`}
        isInvalid={showValidation && !isValid}
        onChange={onChange}
        onBlur={setTouched}
        disabled={autoChecked}
        fullWidth={true}
        compressed
        placeholder={autoChecked ? autoIntervalIsUsedPlaceholder : selectIntervalPlaceholder}
        append={
          <EuiSwitch
            className={'eui-alignMiddle'}
            label="Auto"
            onChange={onAutoSwitchChange}
            checked={autoChecked}
            compressed
          />
        }
      />
    </EuiFormRow>
  );
}

export { NumberIntervalParamEditor };
