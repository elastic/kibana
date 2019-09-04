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
import { safeMakeLabel, isCompatibleAggregation } from '../../../../agg_types/agg_utils';
import { AggParamEditorProps } from '..';

const aggFilter = ['!top_hits', '!percentiles', '!percentile_ranks', '!median', '!std_dev'];
const isCompatibleAgg = isCompatibleAggregation(aggFilter);
const EMPTY_VALUE = 'EMPTY_VALUE';

function MetricAggParamEditor({
  agg,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
  metricAggs,
}: AggParamEditorProps<string>) {
  const label = i18n.translate('common.ui.aggTypes.metricLabel', {
    defaultMessage: 'Metric',
  });
  const isValid = !!value;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid]);

  useEffect(() => {
    if (metricAggs && value && value !== 'custom') {
      // ensure that metricAgg is set to a valid agg
      const respAgg = metricAggs
        .filter(isCompatibleAgg)
        .find(aggregation => aggregation.id === value);

      if (!respAgg) {
        setValue();
      }
    }
  }, [metricAggs]);

  const options = metricAggs
    ? metricAggs
        .filter(respAgg => respAgg.type.name !== agg.type.name)
        .map(respAgg => ({
          text: i18n.translate('common.ui.aggTypes.definiteMetricLabel', {
            defaultMessage: 'Metric: {safeMakeLabel}',
            values: {
              safeMakeLabel: safeMakeLabel(respAgg),
            },
          }),
          value: respAgg.id,
          disabled: !isCompatibleAgg(respAgg),
        }))
    : [];

  options.push({
    text: i18n.translate('common.ui.aggTypes.customMetricLabel', {
      defaultMessage: 'Custom metric',
    }),
    value: 'custom',
    disabled: false,
  });

  if (!value) {
    options.unshift({ text: '', value: EMPTY_VALUE, disabled: false });
  }

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      compressed
    >
      <EuiSelect
        options={options}
        value={value || EMPTY_VALUE}
        onChange={ev => setValue(ev.target.value)}
        fullWidth={true}
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
        data-test-subj={`visEditorSubAggMetric${agg.id}`}
      />
    </EuiFormRow>
  );
}

export { MetricAggParamEditor };
