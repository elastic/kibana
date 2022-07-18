/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { AggParamType, IAggConfig, AggGroupNames } from '@kbn/data-plugin/public';
import { useSubAggParamsHandlers } from './utils';
import { AggParamEditorProps } from '../agg_param_props';
import { DefaultEditorAggParams } from '../agg_params';

function SubAggParamEditor({
  agg,
  aggParam,
  formIsTouched,
  metricAggs,
  state,
  setValue,
  setValidity,
  setTouched,
  schemas,
}: AggParamEditorProps<IAggConfig, AggParamType>) {
  useEffect(() => {
    // we aren't creating a custom aggConfig
    if (agg.params.metricAgg !== 'custom') {
      setValue(undefined);
    } else if (!agg.params.customMetric) {
      setValue(aggParam.makeAgg(agg));
    }
  }, [metricAggs, agg, setValue, aggParam]);

  const { onAggTypeChange, setAggParamValue } = useSubAggParamsHandlers(
    agg,
    aggParam,
    agg.params.customMetric,
    setValue
  );

  if (agg.params.metricAgg !== 'custom' || !agg.params.customMetric) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <DefaultEditorAggParams
        agg={agg.params.customMetric}
        allowedAggs={aggParam.allowedAggs}
        groupName={AggGroupNames.Metrics}
        className="visEditorAgg__subAgg"
        formIsTouched={formIsTouched}
        indexPattern={agg.getIndexPattern()}
        metricAggs={metricAggs}
        state={state}
        setAggParamValue={setAggParamValue}
        onAggTypeChange={onAggTypeChange}
        setValidity={setValidity}
        setTouched={setTouched}
        schemas={schemas}
        hideCustomLabel={true}
      />
    </>
  );
}

export { SubAggParamEditor };
