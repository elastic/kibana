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
import { OnParamChange } from './agg_common_props';

interface DefaultEditorAggParamProps<T> extends AggParamCommonProps<T> {
  paramEditor: React.ComponentType<AggParamEditorProps<T>>;
  onChange: OnParamChange;
}

function DefaultEditorAggParam<T>(props: DefaultEditorAggParamProps<T>) {
  const { agg, aggParam, paramEditor: ParamEditor, onChange, setValidity, ...rest } = props;

  const setValue = useCallback((value: T) => onChange(agg.id, aggParam.name, value), [
    onChange,
    agg.params,
    aggParam.name,
  ]);

  useEffect(() => {
    if (aggParam.shouldShow && !aggParam.shouldShow(agg)) {
      setValidity(true);
    }
  }, [agg, agg.params.field]);

  if (aggParam.shouldShow && !aggParam.shouldShow(agg)) {
    return null;
  }

  return (
    <ParamEditor
      agg={agg}
      aggParam={aggParam}
      setValidity={setValidity}
      setValue={setValue}
      {...rest}
    />
  );
}

export { DefaultEditorAggParam };
