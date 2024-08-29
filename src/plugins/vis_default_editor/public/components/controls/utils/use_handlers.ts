/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import type { SerializableRecord } from '@kbn/utility-types';

import { IAggConfig, AggParamType, AggConfigSerialized } from '@kbn/data-plugin/public';
import { DefaultEditorCommonProps } from '../../agg_common_props';

type SetValue = (value?: IAggConfig) => void;

function useSubAggParamsHandlers(
  agg: IAggConfig,
  aggParam: AggParamType,
  subAgg: IAggConfig,
  setValue: SetValue
): Pick<DefaultEditorCommonProps, 'onAggTypeChange' | 'setAggParamValue'> {
  const setAggParamValue = useCallback<DefaultEditorCommonProps['setAggParamValue']>(
    (_, paramName, val) => {
      const parsedParams = subAgg.serialize();
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

  const onAggTypeChange = useCallback<DefaultEditorCommonProps['onAggTypeChange']>(
    (_, aggType) => {
      const parsedAgg = subAgg.serialize();
      const parsedAggParams = parsedAgg.params as SerializableRecord;

      // we should share between aggs only field and base params: json, label, time shift.
      const params: AggConfigSerialized = {
        ...parsedAgg,
        params: {
          field: parsedAggParams.field,
          json: parsedAggParams.json,
          customLabel: parsedAggParams.customLabel,
          timeShift: parsedAggParams.timeShift,
        },
        // @ts-ignore - Need to verify type
        type: aggType,
      };

      setValue(aggParam.makeAgg(agg, params));
    },
    [agg, aggParam, setValue, subAgg]
  );

  return { onAggTypeChange, setAggParamValue };
}

export { useSubAggParamsHandlers };
