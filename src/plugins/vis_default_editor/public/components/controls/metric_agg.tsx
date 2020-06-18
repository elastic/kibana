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

import React, { useMemo, useCallback } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAvailableOptions, useFallbackMetric, useValidation } from './utils';
import { AggParamEditorProps } from '../agg_param_props';

const aggFilter = ['!top_hits', '!percentiles', '!percentile_ranks', '!median', '!std_dev'];
const EMPTY_VALUE = 'EMPTY_VALUE';
const DEFAULT_OPTIONS = [{ text: '', value: EMPTY_VALUE, hidden: true }];

function MetricAggParamEditor({
  agg,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
  metricAggs = [],
}: AggParamEditorProps<string>) {
  const label = i18n.translate('visDefaultEditor.controls.metricLabel', {
    defaultMessage: 'Metric',
  });
  const isValid = !!value;

  useValidation(setValidity, isValid);
  useFallbackMetric(setValue, aggFilter, metricAggs, value);

  const filteredMetrics = useMemo(
    () => metricAggs.filter((respAgg) => respAgg.type.name !== agg.type.name),
    [metricAggs, agg.type.name]
  );
  const options = useAvailableOptions(aggFilter, filteredMetrics, DEFAULT_OPTIONS);
  const onChange = useCallback((ev) => setValue(ev.target.value), [setValue]);

  return (
    <EuiFormRow label={label} fullWidth isInvalid={showValidation && !isValid} compressed>
      <EuiSelect
        compressed
        fullWidth
        options={options}
        value={value || EMPTY_VALUE}
        onChange={onChange}
        isInvalid={showValidation && !isValid}
        onBlur={setTouched}
        data-test-subj={`visEditorSubAggMetric${agg.id}`}
      />
    </EuiFormRow>
  );
}

export { DEFAULT_OPTIONS, aggFilter, MetricAggParamEditor };
