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
import { EuiFormRow, EuiIconTip, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { search, AggParamOption } from '../../../../data/public';
import { AggParamEditorProps } from '../agg_param_props';
const { parseEsInterval, InvalidEsCalendarIntervalError } = search.aggs;

// we check if Elasticsearch interval is valid to show a user appropriate error message
// e.g. there is the case when a user inputs '14d' but it's '2w' in expression equivalent and the request will fail
// we don't check it for 0ms because the overall time range has not yet been set
function isValidCalendarInterval(interval: string) {
  if (interval === '0ms') {
    return { isValidCalendarValue: true };
  }

  try {
    parseEsInterval(interval);
    return { isValidCalendarValue: true };
  } catch (e) {
    if (e instanceof InvalidEsCalendarIntervalError) {
      return { isValidCalendarValue: false, error: e.message };
    }

    return { isValidCalendarValue: true };
  }
}

const errorMessage = i18n.translate(
  'visDefaultEditor.controls.timeInterval.invalidFormatErrorMessage',
  {
    defaultMessage: 'Invalid interval format.',
  }
);

function validateInterval(
  agg: any,
  value?: string,
  definedOption?: ComboBoxOption,
  timeBase?: string
) {
  if (definedOption) {
    return { isValid: true, interval: agg.buckets?.getInterval() };
  }

  if (!value) {
    return { isValid: false };
  }

  if (!timeBase) {
    // we check if Elasticsearch interval is valid ES interval to show a user appropriate error message
    // we don't check if there is timeBase
    const { isValidCalendarValue, error } = isValidCalendarInterval(value);
    if (!isValidCalendarValue) {
      return { isValid: false, error };
    }
  }

  const isValid = search.aggs.isValidInterval(value, timeBase);

  if (!isValid) {
    return { isValid: false, error: errorMessage };
  }

  const interval = agg.buckets?.getInterval();

  const { isValidCalendarValue, error } = isValidCalendarInterval(interval.expression);
  if (!isValidCalendarValue) {
    return { isValid: false, error };
  }

  return { isValid, interval };
}

interface ComboBoxOption extends EuiComboBoxOptionOption {
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
  const timeBase: string = get(editorConfig, 'interval.timeBase') as string;
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
  if (value) {
    definedOption = find(options, { key: value });
    selectedOptions = definedOption ? [definedOption] : [{ label: value, key: 'custom' }];
  }

  const { isValid, error, interval } = validateInterval(agg, value, definedOption, timeBase);

  const scaledHelpText =
    interval && interval.scaled ? (
      <strong data-test-subj="currentlyScaledText" className="eui-displayBlock">
        <FormattedMessage
          id="visDefaultEditor.controls.timeInterval.scaledHelpText"
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

  const onCustomInterval = (customValue: string) => setValue(customValue.trim());

  const onChange = (opts: EuiComboBoxOptionOption[]) => {
    const selectedOpt: ComboBoxOption = get(opts, '0');
    setValue(selectedOpt ? selectedOpt.key : '');
  };

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  return (
    <EuiFormRow
      compressed
      error={error}
      fullWidth={true}
      helpText={helpText}
      isInvalid={showValidation && !isValid}
      label={i18n.translate('visDefaultEditor.controls.timeInterval.minimumIntervalLabel', {
        defaultMessage: 'Minimum interval',
      })}
    >
      <EuiComboBox
        compressed
        fullWidth={true}
        data-test-subj="visEditorInterval"
        isInvalid={showValidation && !isValid}
        noSuggestions={!!timeBase}
        onChange={onChange}
        onCreateOption={onCustomInterval}
        options={options}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        placeholder={i18n.translate(
          'visDefaultEditor.controls.timeInterval.selectIntervalPlaceholder',
          {
            defaultMessage: 'Select an interval',
          }
        )}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

const tooManyBucketsTooltip = (
  <FormattedMessage
    id="visDefaultEditor.controls.timeInterval.createsTooManyBucketsTooltip"
    defaultMessage="This interval creates too many buckets to show in the selected time range, so it has been scaled up."
  />
);
const tooLargeBucketsTooltip = (
  <FormattedMessage
    id="visDefaultEditor.controls.timeInterval.createsTooLargeBucketsTooltip"
    defaultMessage="This interval creates buckets that are too large to show in the selected time range, so it has been scaled down."
  />
);
const selectOptionHelpText = (
  <FormattedMessage
    id="visDefaultEditor.controls.timeInterval.selectOptionHelpText"
    defaultMessage="Select an option or create a custom value. Examples: 30s, 20m, 24h, 2d, 1w, 1M"
  />
);

export { TimeIntervalParamEditor };
