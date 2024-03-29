/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAvailableOptions, useFallbackMetric, useValidation } from './utils';
import { AggParamEditorProps } from '../agg_param_props';

const aggFilter = [
  '!top_hits',
  '!top_metrics',
  '!percentiles',
  '!percentile_ranks',
  '!median',
  '!std_dev',
];
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
    <EuiFormRow
      label={label}
      fullWidth
      isInvalid={showValidation && !isValid}
      display="rowCompressed"
    >
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
