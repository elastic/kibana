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

import { get, find } from 'lodash';
import React, { useEffect } from 'react';

import { EuiFormRow, EuiIconTip, EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggParamEditorProps } from '../../vis/editors/default';
import { AggParamOption } from '../agg_param';
import { parseInterval } from '../utils';

interface ComboBoxOption extends EuiComboBoxOptionProps {
  key: string;
}

function TimeIntervalParamEditor({
  agg,
  aggParam,
  editorConfig,
  value = '',
  setValue,
  isInvalid,
  setTouched,
  setValidity,
}: AggParamEditorProps<string>) {
  const label = i18n.translate('common.ui.aggTypes.timeInterval.minimumIntervalLabel', {
    defaultMessage: 'Minimum interval',
  });
  const interval = get(agg, 'buckets.getInterval') && agg.buckets.getInterval();
  const scaledHepText =
    interval && interval.scaled && !isInvalid ? (
      <label>
        <FormattedMessage
          id="common.ui.aggTypes.timeInterval.scaledHelpText"
          defaultMessage="Currently scaled to {bucketDescription}"
          values={{ bucketDescription: get(interval, 'description') || '' }}
        />{' '}
        <EuiIconTip
          position="right"
          type="questionInCircle"
          color="text"
          content={interval.scale <= 1 ? tooManyBucketsTooltip : tooLargeBucketsTooltip}
        />
      </label>
    ) : null;

  const helpText = (
    <>
      {scaledHepText}
      {get(editorConfig, 'interval.help') || selectOptionHelpText}
    </>
  );

  const timeBase: string = get(editorConfig, 'interval.timeBase');
  const options = (aggParam.options || []).reduce(
    (filtered: ComboBoxOption[], option: AggParamOption) => {
      if (option.enabled ? option.enabled(agg) : true) {
        filtered.push({ label: option.display, key: option.val });
      }
      return filtered;
    },
    [] as ComboBoxOption[]
  );
  const definedOption = find(options, { key: value });
  const selectedOptions = definedOption ? [definedOption] : [{ label: value, key: 'custom' }];
  const errors = [];

  if (isInvalid && value) {
    errors.push(
      i18n.translate('common.ui.aggTypes.timeInterval.invalidFormatErrorMessage', {
        defaultMessage: 'Invalid interval format.',
      })
    );
  }

  const onCustomInterval = (customValue: string) => {
    const normalizedCustomValue = customValue.trim();
    const isValid = normalizedCustomValue ? parseInterval(normalizedCustomValue, timeBase) : false;

    setValidity(isValid);
    setValue(normalizedCustomValue);
    setTouched();
  };

  const onChange = (opts: EuiComboBoxOptionProps[]) => {
    const selectedOpt: ComboBoxOption = get(opts, '0');
    setValidity(!!selectedOpt);
    setValue(selectedOpt ? selectedOpt.key : selectedOpt);
    setTouched();
  };

  useEffect(
    () => {
      setValidity(value ? (definedOption ? true : parseInterval(value, timeBase)) : false);
    },
    [value]
  );

  return (
    <EuiFormRow
      className="visEditorSidebar__aggParamFormRow"
      error={errors}
      fullWidth={true}
      helpText={helpText}
      isInvalid={isInvalid}
      label={label}
    >
      <EuiComboBox
        fullWidth={true}
        data-test-subj="visEditorInterval"
        isInvalid={isInvalid}
        noSuggestions={!!timeBase}
        onChange={onChange}
        onCreateOption={onCustomInterval}
        options={options}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
      />
    </EuiFormRow>
  );
}

const tooManyBucketsTooltip = (
  <FormattedMessage
    id="common.ui.aggTypes.timeInterval.createsTooManyBucketsTooltip"
    defaultMessage="This interval creates too many buckets to show in the selected time range, so it has been scaled up."
  />
);
const tooLargeBucketsTooltip = (
  <FormattedMessage
    id="common.ui.aggTypes.timeInterval.createsTooLargeBucketsTooltip"
    defaultMessage="This interval creates buckets that are too large to show in the selected time range, so it has been scaled up."
  />
);
const selectOptionHelpText = (
  <FormattedMessage
    id="common.ui.aggTypes.timeInterval.selectOptionHelpText"
    defaultMessage="Select an option or create a custom value. Examples: 30s, 20m, 24h, 2d, 1w, 1M"
  />
);

export { TimeIntervalParamEditor };
