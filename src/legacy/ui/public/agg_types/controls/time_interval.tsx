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

import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggParamEditorProps } from '../../vis/editors/default';
import { AggParamOption } from '../agg_param';

interface SelectOption {
  value: string;
  text: string;
  option: AggParamOption;
}

function TimeIntervalParamEditor({
  agg,
  aggParam = { options: [] } as any,
  editorConfig,
  value,
  setValue,
  isInvalid,
  setTouched,
  setValidity,
}: AggParamEditorProps<AggParamOption>) {
  const timeBase = get(editorConfig, 'customInterval.timeBase');

  if (timeBase) {
    return null;
  }

  const interval = get(agg, 'buckets.getInterval') && agg.buckets.getInterval();
  const isTooManyBuckets = interval && interval.scaled && interval.scale <= 1;
  const isTooLargeBuckets = interval && interval.scaled && interval.scale > 1;
  const label = (
    <>
      <FormattedMessage
        id="common.ui.aggTypes.timeInterval.intervalLabel"
        defaultMessage="Interval"
      />{' '}
      {isTooManyBuckets && (
        <EuiIconTip
          position="right"
          type="alert"
          color="text"
          content={i18n.translate('common.ui.aggTypes.timeInterval.createsTooManyBucketsTooltip', {
            defaultMessage:
              'This interval creates too many buckets to show in the selected time range, so it has been scaled to {bucketDescription}',
            values: { bucketDescription: interval ? interval.description : '' },
          })}
        />
      )}
      {isTooLargeBuckets && (
        <EuiIconTip
          position="right"
          type="alert"
          color="text"
          content={i18n.translate('common.ui.aggTypes.timeInterval.createsTooLargeBucketsTooltip', {
            defaultMessage:
              'This interval creates buckets that are too large to show in the selected time range, so it has been scaled to {bucketDescription}',
            values: { bucketDescription: interval ? interval.description : '' },
          })}
        />
      )}
    </>
  );

  const aggParamOptions = (aggParam && aggParam.options) || [];
  const selectedOption = value ? value.val : '';
  const options = aggParamOptions.reduce(
    (filtered, option) => {
      if (option.enabled ? option.enabled(agg) : true) {
        filtered.push({ value: option.val, text: option.display, option });
      }
      return filtered;
    },
    [] as SelectOption[]
  );

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = aggParamOptions.find(opt => opt.val === e.target.value);
    setValue(selectedValue);
  };

  useEffect(
    () => {
      if (!timeBase) {
        setValidity(!!value);
      }
    },
    [value]
  );

  return (
    <EuiFormRow
      label={label}
      isInvalid={isInvalid}
      fullWidth={true}
      className="visEditorSidebar__aggParamFormRow"
    >
      <EuiSelect
        id={`visEditorInterval${agg.id}`}
        options={options}
        hasNoInitialSelection={true}
        value={selectedOption}
        isInvalid={isInvalid}
        onChange={onChange}
        data-test-subj="visDefaultEditorField"
        fullWidth={true}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

export { TimeIntervalParamEditor };
