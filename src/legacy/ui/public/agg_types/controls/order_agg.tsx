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
  config,
  value,
  responseValueAggs,
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
        if (orderBy && orderBy === 'custom') {
          const paramDef = agg.type.params.byName.orderAgg;
          setValue(value || paramDef.makeOrderAgg(agg));
        } else {
          // we aren't creating a custom aggConfig
          setValue(null);
        }
      }
    },
    [agg.params.orderBy, responseValueAggs]
  );

  const [state, setState] = useState(true);

  if (!agg.params.orderAgg) {
    return null;
  }

  return (
    <DefaultEditorAggParams
      agg={value}
      groupName="metrics"
      config={config}
      className="visEditorAgg__subAgg"
      formIsTouched={subAggParams.formIsTouched}
      indexPattern={agg.getIndexPattern()}
      responseValueAggs={responseValueAggs}
      vis={subAggParams.vis}
      onAggParamsChange={(...rest) => {
        // to force update when sub-agg params are changed
        setState(!state);
        subAggParams.onAggParamsChange(...rest);
      }}
      onAggTypeChange={subAggParams.onAggTypeChange}
      setValidity={setValidity}
      setTouched={setTouched}
    />
  );
}

export { OrderAggParamEditor };
