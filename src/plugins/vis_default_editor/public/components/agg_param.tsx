/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';

import { AggParamEditorProps, AggParamCommonProps } from './agg_param_props';
import { DefaultEditorAggCommonProps } from './agg_common_props';
import { AGG_PARAMS_ACTION_KEYS, AggParamsAction } from './agg_params_state';

interface DefaultEditorAggParamProps<T> extends AggParamCommonProps<T> {
  paramEditor: React.ComponentType<AggParamEditorProps<T>>;
  setAggParamValue: DefaultEditorAggCommonProps['setAggParamValue'];
  onChangeParamsState: React.Dispatch<AggParamsAction>;
}

function DefaultEditorAggParam<T>(props: DefaultEditorAggParamProps<T>) {
  const {
    agg,
    aggParam,
    paramEditor: ParamEditor,
    setAggParamValue,
    onChangeParamsState,
    ...rest
  } = props;

  const setValidity = useCallback(
    (valid: boolean) => {
      onChangeParamsState({
        type: AGG_PARAMS_ACTION_KEYS.VALID,
        paramName: aggParam.name,
        payload: valid,
      });
    },
    [onChangeParamsState, aggParam.name]
  );

  // setTouched can be called from sub-agg which passes a parameter
  const setTouched = useCallback(
    (isTouched: boolean = true) => {
      onChangeParamsState({
        type: AGG_PARAMS_ACTION_KEYS.TOUCHED,
        paramName: aggParam.name,
        payload: isTouched,
      });
    },
    [onChangeParamsState, aggParam.name]
  );

  const setValue = useCallback(
    (value: T) => {
      if (props.value !== value) {
        setAggParamValue(agg.id, aggParam.name, value);
      }
    },
    [setAggParamValue, agg.id, aggParam.name, props.value]
  );

  useEffect(() => {
    if (aggParam.shouldShow && !aggParam.shouldShow(agg)) {
      setValidity(true);
    }
  }, [agg, agg.params.field, aggParam, setValidity]);

  if (aggParam.shouldShow && !aggParam.shouldShow(agg)) {
    return null;
  }

  return (
    <ParamEditor
      agg={agg}
      aggParam={aggParam}
      setValidity={setValidity}
      setTouched={setTouched}
      setValue={setValue}
      {...rest}
    />
  );
}

export { DefaultEditorAggParam };
