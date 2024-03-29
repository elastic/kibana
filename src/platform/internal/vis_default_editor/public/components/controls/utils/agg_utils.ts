/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { IAggConfig } from '@kbn/data-plugin/public';

type AggFilter = string[];

const DEFAULT_METRIC = 'custom';
const CUSTOM_METRIC = {
  text: i18n.translate('visDefaultEditor.controls.customMetricLabel', {
    defaultMessage: 'Custom metric',
  }),
  value: DEFAULT_METRIC,
};

function useCompatibleAggCallback(aggFilter: AggFilter) {
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  return useCallback(isCompatibleAggregation(aggFilter), [aggFilter]);
}

/**
 * the effect is used to set up a default metric aggregation in case,
 * when previously selected metric has been removed
 */
function useFallbackMetric(
  setValue: (value?: string) => void,
  aggFilter: AggFilter,
  metricAggs?: IAggConfig[],
  value?: string,
  fallbackValue?: string
) {
  const isCompatibleAgg = useCompatibleAggCallback(aggFilter);

  useEffect(() => {
    if (metricAggs && value && value !== DEFAULT_METRIC) {
      // ensure that metric is set to a valid agg
      const respAgg = metricAggs
        .filter(isCompatibleAgg)
        .find((aggregation) => aggregation.id === value);

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
  metricAggs: IAggConfig[] = [],
  defaultOptions: Array<{ text: string; value: string }> = []
) {
  const isCompatibleAgg = useCompatibleAggCallback(aggFilter);

  const options = useMemo(
    () => [
      ...metricAggs.map((respAgg) => ({
        text: i18n.translate('visDefaultEditor.controls.definiteMetricLabel', {
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
  }, [isValid, setValidity]);
}

function safeMakeLabel(agg: IAggConfig): string {
  try {
    return agg.makeLabel();
  } catch (e) {
    return i18n.translate('visDefaultEditor.controls.aggNotValidLabel', {
      defaultMessage: '- agg not valid -',
    });
  }
}

function isCompatibleAggregation(aggFilter: string[]) {
  return (agg: IAggConfig) => {
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
