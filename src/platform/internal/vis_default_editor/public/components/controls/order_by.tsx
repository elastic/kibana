/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useMount from 'react-use/lib/useMount';

import { search } from '@kbn/data-plugin/public';
import {
  isCompatibleAggregation,
  useAvailableOptions,
  useFallbackMetric,
  useValidation,
} from './utils';
import { AggParamEditorProps } from '../agg_param_props';

const { termsAggFilter } = search.aggs;
const DEFAULT_VALUE = '_key';
const DEFAULT_OPTIONS = [
  {
    text: i18n.translate('visDefaultEditor.controls.orderAgg.alphabeticalLabel', {
      defaultMessage: 'Alphabetical',
    }),
    value: DEFAULT_VALUE,
  },
];

const isCompatibleAgg = isCompatibleAggregation(termsAggFilter);

function OrderByParamEditor({
  agg,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
  metricAggs,
}: AggParamEditorProps<string>) {
  const label = i18n.translate('visDefaultEditor.controls.orderAgg.orderByLabel', {
    defaultMessage: 'Order by',
  });
  const isValid = !!value;

  useValidation(setValidity, isValid);
  useMount(() => {
    // setup the initial value of orderBy
    if (!value) {
      let respAgg = { id: DEFAULT_VALUE };

      if (metricAggs) {
        respAgg = metricAggs.filter(isCompatibleAgg)[0] || respAgg;
      }

      setValue(respAgg.id);
    }
  });

  useFallbackMetric(setValue, termsAggFilter, metricAggs, value, DEFAULT_VALUE);

  const options = useAvailableOptions(termsAggFilter, metricAggs, DEFAULT_OPTIONS);

  return (
    <EuiFormRow
      label={label}
      fullWidth
      isInvalid={showValidation && !isValid}
      display="rowCompressed"
    >
      <EuiSelect
        options={options}
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        fullWidth={true}
        compressed
        isInvalid={showValidation && !isValid}
        onBlur={setTouched}
        data-test-subj={`visEditorOrderBy${agg.id}`}
      />
    </EuiFormRow>
  );
}

export { OrderByParamEditor };
