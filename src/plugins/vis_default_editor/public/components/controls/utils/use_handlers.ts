/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
