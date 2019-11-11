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
import { EuiSpacer } from '@elastic/eui';
import { AggParamType } from '../../../../agg_types/param_types/agg';
import { AggConfig } from '../../..';
import { AggParamEditorProps, DefaultEditorAggParams } from '..';

function OrderAggParamEditor({
  agg,
  aggParam,
  value,
  metricAggs,
  state,
  setValue,
  setValidity,
  setTouched,
  subAggParams,
}: AggParamEditorProps<AggConfig>) {
  const orderBy = agg.params.orderBy;

  useEffect(() => {
    if (orderBy === 'custom' && !value) {
      setValue((aggParam as AggParamType).makeAgg(agg));
    }

    if (orderBy !== 'custom' && value) {
      setValue(undefined);
    }
  }, [orderBy]);

  if (!agg.params.orderAgg) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <DefaultEditorAggParams
        agg={value as AggConfig}
        groupName="metrics"
        className="visEditorAgg__subAgg"
        formIsTouched={subAggParams.formIsTouched}
        indexPattern={agg.getIndexPattern()}
        metricAggs={metricAggs}
        state={state}
        setAggParamValue={subAggParams.setAggParamValue}
        onAggTypeChange={subAggParams.onAggTypeChange}
        setValidity={setValidity}
        setTouched={setTouched}
      />
    </>
  );
}

export { OrderAggParamEditor };
