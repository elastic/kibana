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

function OrderAggParamEditor({
  agg,
  aggParam,
  formIsTouched,
  value,
  metricAggs,
  state,
  setValue,
  setValidity,
  setTouched,
  schemas,
}: AggParamEditorProps<IAggConfig, AggParamType>) {
  const orderBy = agg.params.orderBy;

  useEffect(() => {
    if (orderBy === 'custom' && !value) {
      setValue(aggParam.makeAgg(agg));
    }

    if (orderBy !== 'custom' && value) {
      setValue(undefined);
    }
  }, [agg, aggParam, orderBy, setValue, value]);

  const { onAggTypeChange, setAggParamValue } = useSubAggParamsHandlers(
    agg,
    aggParam,
    value as IAggConfig,
    setValue
  );

  if (!agg.params.orderAgg) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <DefaultEditorAggParams
        agg={value as IAggConfig}
        allowedAggs={aggParam.allowedAggs}
        hideCustomLabel={true}
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
      />
    </>
  );
}

export { OrderAggParamEditor };
