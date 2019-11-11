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

import React, { useEffect, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AggParamType } from '../../../../agg_types/param_types/agg';
import { AggConfig } from '../../..';
import { AggParamEditorProps, DefaultEditorAggParams } from '..';

function SubAggParamEditor({
  agg,
  aggParam,
  value,
  metricAggs,
  state,
  setValue,
  setValidity,
  setTouched,
  subAggParams,
}: AggParamEditorProps<AggConfig, AggParamType>) {
  useEffect(() => {
    // we aren't creating a custom aggConfig
    if (agg.params.metricAgg !== 'custom') {
      setValue(undefined);
    } else if (!agg.params.customMetric) {
      // const customMetric = agg.type.paramByName('customMetric');
      // if (customMetric) {
      //   setValue(customMetric.makeAgg(agg));
      // }
      setValue(aggParam.makeAgg(agg));
    }
  }, [value, metricAggs]);

  const setAggParamValue = useCallback(
    (aggId, paramName, val) => {
      const parsedParams = agg.params.customMetric.toJSON();
      const params = {
        ...parsedParams,
        params: {
          ...parsedParams.params,
          [paramName]: val,
        },
      };

      setValue(aggParam.makeAgg(agg, params));
    },
    [agg, setValue]
  );
  const onAggTypeChange = useCallback(
    (aggId, aggType) => {
      const parsedAgg = agg.params.customMetric.toJSON();

      const params = {
        ...parsedAgg,
        type: aggType,
      };

      setValue(aggParam.makeAgg(agg, params));
    },
    [agg, setValue]
  );

  if (agg.params.metricAgg !== 'custom' || !agg.params.customMetric) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <DefaultEditorAggParams
        agg={agg.params.customMetric}
        groupName="metrics"
        className="visEditorAgg__subAgg"
        formIsTouched={subAggParams.formIsTouched}
        indexPattern={agg.getIndexPattern()}
        metricAggs={metricAggs}
        state={state}
        setAggParamValue={setAggParamValue}
        onAggTypeChange={onAggTypeChange}
        setValidity={setValidity}
        setTouched={setTouched}
      />
    </>
  );
}

export { SubAggParamEditor };
