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

import { useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { AggConfig } from 'ui/agg_types';

type AggFilter = string[];

const DEFAULT_METRIC = 'custom';
const CUSTOM_METRIC = {
  text: i18n.translate('common.ui.aggTypes.customMetricLabel', {
    defaultMessage: 'Custom metric',
  }),
  value: DEFAULT_METRIC,
};

function useCompatibleAggCallback(aggFilter: AggFilter) {
  return useCallback(isCompatibleAggregation(aggFilter), [aggFilter]);
}

/**
 * the effect is used to set up a default metric aggregation in case,
 * when previously selected metric has been removed
 */
function useFallbackMetric(
  setValue: (value?: string) => void,
  aggFilter: AggFilter,
  metricAggs?: AggConfig[],
  value?: string,
  fallbackValue?: string
) {
  const isCompatibleAgg = useCompatibleAggCallback(aggFilter);

  useEffect(() => {
    if (metricAggs && value && value !== DEFAULT_METRIC) {
      // ensure that metric is set to a valid agg
      const respAgg = metricAggs
        .filter(isCompatibleAgg)
        .find(aggregation => aggregation.id === value);

      if (!respAgg && value !== fallbackValue) {
        setValue(fallbackValue);
      }
    }
  }, [setValue, isCompatibleAgg, metricAggs, value, fallbackValue]);
}

/**
 * this makes an array of available options in appropriate format for EuiSelect,
 * calculates if an option is disabled
 */
function useAvailableOptions(
  aggFilter: AggFilter,
  metricAggs: AggConfig[] = [],
  defaultOptions: Array<{ text: string; value: string }> = []
) {
  const isCompatibleAgg = useCompatibleAggCallback(aggFilter);

  const options = useMemo(
    () => [
      ...metricAggs.map(respAgg => ({
        text: i18n.translate('common.ui.aggTypes.definiteMetricLabel', {
          defaultMessage: 'Metric: {metric}',
          values: {
            metric: safeMakeLabel(respAgg),
          },
        }),
        value: respAgg.id,
        disabled: !isCompatibleAgg(respAgg),
      })),
      CUSTOM_METRIC,
      ...defaultOptions,
    ],
    [metricAggs, defaultOptions, isCompatibleAgg]
  );

  return options;
}

/**
 * the effect is used to set up the editor form validity
 * and reset it if a param has been removed
 */
function useValidation(setValidity: (isValid: boolean) => void, isValid: boolean) {
  useEffect(() => {
    setValidity(isValid);

    return () => setValidity(true);
  }, [isValid]);
}

function safeMakeLabel(agg: AggConfig): string {
  try {
    return agg.makeLabel();
  } catch (e) {
    return i18n.translate('common.ui.aggTypes.aggNotValidLabel', {
      defaultMessage: '- agg not valid -',
    });
  }
}

function isCompatibleAggregation(aggFilter: string[]) {
  return (agg: AggConfig) => {
    return !aggFilter.includes(`!${agg.type.name}`);
  };
}

export {
  CUSTOM_METRIC,
  safeMakeLabel,
  isCompatibleAggregation,
  useAvailableOptions,
  useFallbackMetric,
  useValidation,
};
