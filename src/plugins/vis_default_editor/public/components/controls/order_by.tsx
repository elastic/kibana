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

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMount } from 'react-use';

import {
  isCompatibleAggregation,
  useAvailableOptions,
  useFallbackMetric,
  useValidation,
} from './utils';
import { AggParamEditorProps } from '../agg_param_props';
import { search } from '../../../../data/public';

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
    <EuiFormRow label={label} fullWidth isInvalid={showValidation && !isValid} compressed>
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
