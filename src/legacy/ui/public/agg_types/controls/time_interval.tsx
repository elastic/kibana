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

import { get, find, filter } from 'lodash';
import React, { useEffect, useState } from 'react';

import { EuiFormRow, EuiIconTip, EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggParamEditorProps } from '../../vis/editors/default';
import { AggParamOption, AggParam } from '../agg_param';
import { parseInterval } from '../utils';
import { AggConfig } from 'ui/vis';

interface ComboOption {
  label: string;
  key: string;
}

function TimeIntervalParamEditor({
  agg,
  aggParam,
  editorConfig,
  value,
  setValue,
  isInvalid,
  setTouched,
  setValidity,
}: AggParamEditorProps<string>) {
  const interval = get(agg, 'buckets.getInterval') && agg.buckets.getInterval();
  const isTooManyBuckets = interval && interval.scaled && interval.scale <= 1;
  const isTooLargeBuckets = interval && interval.scaled && interval.scale > 1;
  const label = i18n.translate('common.ui.aggTypes.timeInterval.intervalLabel', {
    defaultMessage: 'Minimum interval',
  });
  const scaledTooltip = isTooManyBuckets
    ? tooManyBucketsTooltip
    : isTooLargeBuckets
    ? tooLargeBucketsTooltip
    : null;
  const scaledHepText =
    isTooManyBuckets || isTooLargeBuckets ? (
      <label>
        <FormattedMessage
          id="common.ui.aggTypes.timeInterval.scaledHelpText"
          defaultMessage="Currently scaled to {bucketDescription}"
          values={{ bucketDescription: interval ? interval.description : '' }}
        />{' '}
        <EuiIconTip position="right" type="questionInCircle" color="text" content={scaledTooltip} />
      </label>
    ) : null;

  const helpText = (
    <>
      {scaledHepText}
      {get(editorConfig, 'interval.help') || selectOptionHelpText}
    </>
  );

  const timeBase: string = get(editorConfig, 'interval.timeBase');
  const options = timeBase
    ? []
    : (aggParam.options || []).reduce(
        (filtered: ComboOption[], option: AggParamOption) => {
          if (option.enabled ? option.enabled(agg) : true) {
            filtered.push({ label: option.display, key: option.val });
          }
          return filtered;
        },
        [] as ComboOption[]
      );

  const onCustomInterval = (customValue: string) => {
    const normalizedCustomValue = customValue.trim();
    const isValid = normalizedCustomValue ? parseInterval(normalizedCustomValue, timeBase) : false;

    console.log('onCustomInterval ' + normalizedCustomValue);

    setValue(normalizedCustomValue);
    setValidity(isValid);
    setTouched();
  };

  const onChange = (opts: ComboOption[]) => {
    const selectedOpt: ComboOption = get(opts, '0');
    console.log('onChange ' + selectedOpt.key);

    setValue(selectedOpt.key);
    setTouched();
  };

  useEffect(
    () => {
      setValidity(!!value);
    },
    [value]
  );

  return (
    <EuiFormRow
      label={label}
      isInvalid={isInvalid}
      fullWidth={true}
      className="visEditorSidebar__aggParamFormRow"
      helpText={helpText}
    >
      <EuiComboBox
        id={`visEditorInterval${agg.id}`}
        options={options}
        singleSelection={{ asPlainText: true }}
        selectedOptions={getSelectedOption(value, options)}
        isInvalid={isInvalid}
        onChange={onChange}
        onCreateOption={onCustomInterval}
        data-test-subj="visEditorInterval"
        fullWidth={true}
        noSuggestions={!!timeBase}
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
    defaultMessage="TThis interval creates buckets that are too large to show in the selected time range, so it has been scaled up."
  />
);
const selectOptionHelpText = (
  <FormattedMessage
    id="common.ui.aggTypes.timeInterval.selectOptionHelpText"
    defaultMessage="Select an option or create a custom value. Examples: 30s, 20m, 24h, 2d, 1w, 1M"
  />
);

function getSelectedOption(key: string, availableOptions: ComboOption[]) {
  if (!key) {
    return [];
  }
  const intervalOption = find(availableOptions, { key });
  return intervalOption ? [intervalOption] : [{ label: key, key: 'custom' }];
}

export { TimeIntervalParamEditor };
