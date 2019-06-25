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

import React, { useEffect, useState } from 'react';
import { AggParamEditorProps, DefaultEditorAggParams } from '../../vis/editors/default';
import { AggConfig } from '../../vis';

function OrderAggParamEditor({
  agg,
  value,
  responseValueAggs,
  state,
  setValue,
  setValidity,
  setTouched,
  subAggParams,
}: AggParamEditorProps<AggConfig>) {
  useEffect(
    () => {
      return () => {
        setValidity(true);
      };
    },
    [value]
  );
  useEffect(
    () => {
      if (responseValueAggs) {
        const orderBy = agg.params.orderBy;

        // we aren't creating a custom aggConfig
        if (!orderBy || orderBy !== 'custom') {
          setValue(null);
        } else {
          const paramDef = agg.type.params.byName.orderAgg;
          setValue(value || paramDef.makeOrderAgg(agg));
        }
      }
    },
    [agg.params.orderBy, responseValueAggs]
  );

  const [innerState, setInnerState] = useState(true);

  if (!agg.params.orderAgg) {
    return null;
  }

  const callbacks = {
    setValidity,
    setTouched,
    onAggTypeChange: subAggParams.onAggTypeChange,
    onAggErrorChanged: subAggParams.onAggErrorChanged,
    onAggParamsChange: (...rest: [AggConfig, string, any]) => {
      // to force update when sub-agg params are changed
      setInnerState(!innerState);
      subAggParams.onAggParamsChange(...rest);
    },
  };

  return (
    <DefaultEditorAggParams
      agg={value}
      groupName="metrics"
      className="visEditorAgg__subAgg"
      formIsTouched={subAggParams.formIsTouched}
      indexPattern={agg.getIndexPattern()}
      responseValueAggs={responseValueAggs}
      state={state}
      vis={subAggParams.vis}
      callbacks={callbacks}
      {...callbacks} // because DefaultEditorAggParams is also AggParamEditorProps in this case
    />
  );
}

export { OrderAggParamEditor };
