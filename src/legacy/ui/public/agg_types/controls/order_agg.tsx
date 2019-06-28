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

import React, { useEffect } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { safeMakeLabel, isCompatibleAggregation } from '../agg_utils';

const aggFilter = [
  '!top_hits',
  '!percentiles',
  '!median',
  '!std_dev',
  '!derivative',
  '!moving_avg',
  '!serial_diff',
  '!cumulative_sum',
  '!avg_bucket',
  '!max_bucket',
  '!min_bucket',
  '!sum_bucket',
];
const isCompatibleAgg = isCompatibleAggregation(aggFilter);

function OrderAggParamEditor({
  agg,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
  responseValueAggs,
}: AggParamEditorProps<string>) {
  const label = i18n.translate('common.ui.aggTypes.orderAgg.orderByLabel', {
    defaultMessage: 'Order by',
  });
  const isValid = !!value;

  useEffect(
    () => {
      setValidity(isValid);
    },
    [isValid]
  );

  useEffect(() => {
    // setup the initial value of orderBy
    if (!value) {
      let respAgg = { id: '_key' };

      if (responseValueAggs) {
        respAgg = responseValueAggs.filter(isCompatibleAgg)[0] || respAgg;
      }

      setValue(respAgg.id);
    }
  }, []);

  useEffect(
    () => {
      if (responseValueAggs && value && value !== 'custom') {
        // ensure that orderBy is set to a valid agg
        const respAgg = responseValueAggs
          .filter(isCompatibleAgg)
          .find(aggregation => aggregation.id === value);

        if (!respAgg) {
          setValue('_key');
        }
      }
    },
    [responseValueAggs]
  );

  const defaultOptions = [
    {
      text: i18n.translate('common.ui.aggTypes.orderAgg.customMetricLabel', {
        defaultMessage: 'Custom metric',
      }),
      value: 'custom',
    },
    {
      text: i18n.translate('common.ui.aggTypes.orderAgg.alphabeticalLabel', {
        defaultMessage: 'Alphabetical',
      }),
      value: '_key',
    },
  ];

  const options = responseValueAggs
    ? responseValueAggs.map(respAgg => ({
        text: i18n.translate('common.ui.aggTypes.orderAgg.metricLabel', {
          defaultMessage: 'Metric: {metric}',
          values: {
            metric: safeMakeLabel(respAgg),
          },
        }),
        value: respAgg.id,
        disabled: !isCompatibleAgg(respAgg),
      }))
    : [];

  return (
    <EuiFormRow label={label} fullWidth={true} isInvalid={showValidation ? !isValid : false}>
      <EuiSelect
        options={[...options, ...defaultOptions]}
        value={value}
        onChange={ev => setValue(ev.target.value)}
        fullWidth={true}
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
        data-test-subj={`visEditorOrderBy${agg.id}`}
      />
    </EuiFormRow>
  );
}

export { OrderAggParamEditor, aggFilter };
