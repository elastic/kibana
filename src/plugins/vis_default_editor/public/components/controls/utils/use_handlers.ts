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

import { useCallback } from 'react';

import { IAggConfig, AggParamType } from 'src/plugins/data/public';

type SetValue = (value?: IAggConfig) => void;

function useSubAggParamsHandlers(
  agg: IAggConfig,
  aggParam: AggParamType,
  subAgg: IAggConfig,
  setValue: SetValue
) {
  const setAggParamValue = useCallback(
    (aggId, paramName, val) => {
      const parsedParams = subAgg.toJSON();
      const params = {
        ...parsedParams,
        params: {
          ...parsedParams.params,
          [paramName]: val,
        },
      };

      setValue(aggParam.makeAgg(agg, params));
    },
    [agg, aggParam, setValue, subAgg]
  );

  const onAggTypeChange = useCallback(
    (aggId, aggType) => {
      const parsedAgg = subAgg.toJSON();

      const params = {
        ...parsedAgg,
        type: aggType,
      };

      setValue(aggParam.makeAgg(agg, params));
    },
    [agg, aggParam, setValue, subAgg]
  );

  return { onAggTypeChange, setAggParamValue };
}

export { useSubAggParamsHandlers };
