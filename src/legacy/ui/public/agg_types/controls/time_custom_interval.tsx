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

import { EuiFieldText, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseInterval } from '../../utils/parse_interval';
import { AggParamEditorProps } from '../../vis/editors/default';
import { leastCommonInterval } from '../../vis/lib/least_common_interval';

function TimeCustomIntervalParamEditor({
  agg,
  editorConfig,
  value,
  setValue,
  isInvalid,
  setTouched,
  setValidity,
}: AggParamEditorProps<string>) {
  const isCustomInterval = agg.params.interval && agg.params.interval.val === 'custom';

  useEffect(
    () => {
      if (isCustomInterval) {
        setValidity(check(value, timeBase));
      } else {
        // Reset validity when interval was changed from custom
        setValidity(true);
      }
    },
    [value, agg.params.interval]
  );

  if (!isCustomInterval) {
    return null;
  }

  const timeBase: string = get(editorConfig, 'customInterval.timeBase');
  const interval = get(agg, 'buckets.getInterval') && agg.buckets.getInterval();
  const isTooManyBuckets = interval && interval.scaled && interval.scale <= 1;
  const isTooLargeBuckets = interval && interval.scaled && interval.scale > 1;
  const label = timeBase ? (
    <>
      <FormattedMessage
        id="common.ui.aggTypes.customTimeInterval.customIntervalLabel"
        defaultMessage="Custom interval"
      />{' '}
      {isTooManyBuckets && (
        <EuiIconTip
          position="right"
          type="alert"
          color="text"
          content={i18n.translate(
            'common.ui.aggTypes.timeCustomInterval.createsTooManyBucketsTooltip',
            {
              defaultMessage:
                'This custom interval creates too many buckets to show in the selected time range, so it has been scaled to {bucketDescription}',
              values: { bucketDescription: interval.description },
            }
          )}
        />
      )}
      {isTooLargeBuckets && (
        <EuiIconTip
          position="right"
          type="alert"
          color="text"
          content={i18n.translate(
            'common.ui.aggTypes.timeCustomInterval.createsTooLargeBucketsTooltip',
            {
              defaultMessage:
                'This custom interval creates buckets that are too large to show in the selected time range, so it has been scaled to {bucketDescription}',
              values: { bucketDescription: interval.description },
            }
          )}
        />
      )}
    </>
  ) : (
    undefined
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isValid = check(e.target.value, timeBase);
    setValidity(isValid);
    setValue(e.target.value);
  };

  return (
    <EuiFormRow
      isInvalid={isInvalid}
      label={label}
      fullWidth={true}
      className="visEditorSidebar__aggParamFormRow"
      helpText={get(editorConfig, 'customInterval.help')}
    >
      <EuiFieldText
        aria-label={i18n.translate('common.ui.aggTypes.customTimeIntervalAriaLabel', {
          defaultMessage: 'Custom interval',
        })}
        value={value || ''}
        onChange={onChange}
        isInvalid={isInvalid}
        fullWidth={true}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

function check(value: string, baseInterval?: string) {
  if (baseInterval) {
    return parseWithBase(value, baseInterval) === true;
  } else {
    return parseInterval(value) != null;
  }
}

// When base interval is set, check for least common interval and allow
// input the value is the same. This means that the input interval is a
// multiple of the base interval.
function parseWithBase(value: string, baseInterval: string) {
  try {
    const interval = leastCommonInterval(baseInterval, value);
    return interval === value.replace(/\s/g, '');
  } catch (e) {
    return false;
  }
}

export { TimeCustomIntervalParamEditor };
