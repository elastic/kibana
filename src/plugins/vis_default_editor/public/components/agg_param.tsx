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
