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
import { AggParamOption } from '../../../../agg_types/agg_params';
import { isValidInterval } from '../../../../agg_types/utils';
import { AggParamEditorProps } from '..';

interface ComboBoxOption extends EuiComboBoxOptionProps {
  key: string;
}

function TimeIntervalParamEditor({
  agg,
  aggParam,
  editorConfig,
  value,
  setValue,
  showValidation,
  setTouched,
  setValidity,
}: AggParamEditorProps<string>) {
  const timeBase: string = get(editorConfig, 'interval.timeBase');
  const options = timeBase
    ? []
    : ((aggParam as any).options || []).reduce(
        (filtered: ComboBoxOption[], option: AggParamOption) => {
          if (option.enabled ? option.enabled(agg) : true) {
            filtered.push({ label: option.display, key: option.val });
          }
          return filtered;
        },
        [] as ComboBoxOption[]
      );

  let selectedOptions: ComboBoxOption[] = [];
  let definedOption: ComboBoxOption | undefined;
  let isValid = false;
  if (value) {
    definedOption = find(options, { key: value });
    selectedOptions = definedOption ? [definedOption] : [{ label: value, key: 'custom' }];
    isValid = !!(definedOption || isValidInterval(value, timeBase));
  }

  const interval = get(agg, 'buckets.getInterval') && (agg as any).buckets.getInterval();
  const scaledHelpText =
    interval && interval.scaled && isValid ? (
      <strong className="eui-displayBlock">
        <FormattedMessage
          id="data.search.aggs.timeInterval.scaledHelpText"
          defaultMessage="Currently scaled to {bucketDescription}"
          values={{ bucketDescription: get(interval, 'description') || '' }}
        />{' '}
        <EuiIconTip
          position="right"
          type="questionInCircle"
          content={interval.scale <= 1 ? tooManyBucketsTooltip : tooLargeBucketsTooltip}
        />
      </strong>
    ) : null;

  const helpText = (
    <>
      {scaledHelpText}
      {get(editorConfig, 'interval.help') || selectOptionHelpText}
    </>
  );

  const errors = [];

  if (!isValid && value) {
    errors.push(
      i18n.translate('data.search.aggs.timeInterval.invalidFormatErrorMessage', {
        defaultMessage: 'Invalid interval format.',
      })
    );
  }

  const onCustomInterval = (customValue: string) => {
    const normalizedCustomValue = customValue.trim();
    setValue(normalizedCustomValue);

    if (normalizedCustomValue && isValidInterval(normalizedCustomValue, timeBase)) {
      agg.write();
    }
  };

  const onChange = (opts: EuiComboBoxOptionProps[]) => {
    const selectedOpt: ComboBoxOption = get(opts, '0');
    setValue(selectedOpt ? selectedOpt.key : selectedOpt);

    if (selectedOpt) {
      agg.write();
    }
  };

  useEffect(() => {
    setValidity(isValid);
  }, [isValid]);

  return (
    <EuiFormRow
      compressed
      error={errors}
      fullWidth={true}
      helpText={helpText}
      isInvalid={showValidation ? !isValid : false}
      label={i18n.translate('data.search.aggs.timeInterval.minimumIntervalLabel', {
        defaultMessage: 'Minimum interval',
      })}
    >
      <EuiComboBox
        compressed
        fullWidth={true}
        data-test-subj="visEditorInterval"
        isInvalid={showValidation ? !isValid : false}
        noSuggestions={!!timeBase}
        onChange={onChange}
        onCreateOption={onCustomInterval}
        options={options}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        placeholder={i18n.translate('data.search.aggs.timeInterval.selectIntervalPlaceholder', {
          defaultMessage: 'Select an interval',
        })}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

const tooManyBucketsTooltip = (
  <FormattedMessage
    id="data.search.aggs.timeInterval.createsTooManyBucketsTooltip"
    defaultMessage="This interval creates too many buckets to show in the selected time range, so it has been scaled up."
  />
);
const tooLargeBucketsTooltip = (
  <FormattedMessage
    id="data.search.aggs.timeInterval.createsTooLargeBucketsTooltip"
    defaultMessage="This interval creates buckets that are too large to show in the selected time range, so it has been scaled down."
  />
);
const selectOptionHelpText = (
  <FormattedMessage
    id="data.search.aggs.timeInterval.selectOptionHelpText"
    defaultMessage="Select an option or create a custom value. Examples: 30s, 20m, 24h, 2d, 1w, 1M"
  />
);

export { TimeIntervalParamEditor };
