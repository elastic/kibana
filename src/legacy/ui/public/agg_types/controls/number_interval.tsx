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
import React, { useEffect } from 'react';

import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggParamEditorProps } from '../../vis/editors/default';

const label = (
  <>
    <FormattedMessage
      id="common.ui.aggTypes.numberInterval.minimumIntervalLabel"
      defaultMessage="Minimum interval"
    />{' '}
    <EuiIconTip
      position="right"
      content={
        <FormattedMessage
          id="common.ui.aggTypes.numberInterval.minimumIntervalTooltip"
          defaultMessage="Interval will be automatically scaled in the event that the provided value creates more buckets than specified by Advanced Setting's {histogramMaxBars}"
          values={{ histogramMaxBars: 'histogram:maxBars' }}
        />
      }
      type="questionInCircle"
    />
  </>
);

function NumberIntervalParamEditor({
  agg,
  editorConfig,
  showValidation,
  value,
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<number | undefined>) {
  const base: number = get(editorConfig, 'interval.base');
  const min = base || 0;
  const isValid = value !== undefined && value >= min;

  useEffect(
    () => {
      setValidity(isValid);
    },
    [isValid]
  );

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numberValue = parseFloat(event.target.value);
    setValue(isNaN(numberValue) ? undefined : numberValue);
  };

  return (
    <EuiFormRow
      className="visEditorSidebar__aggParamFormRow"
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      helpText={get(editorConfig, 'interval.help')}
    >
      <EuiFieldNumber
        value={value === undefined ? '' : value}
        min={min}
        step={base}
        data-test-subj={`visEditorInterval${agg.id}`}
        isInvalid={showValidation ? !isValid : false}
        onChange={onChange}
        onBlur={setTouched}
        fullWidth={true}
        placeholder={i18n.translate('common.ui.aggTypes.numberInterval.selectIntervalPlaceholder', {
          defaultMessage: 'Enter an interval',
        })}
      />
    </EuiFormRow>
  );
}

export { NumberIntervalParamEditor };
