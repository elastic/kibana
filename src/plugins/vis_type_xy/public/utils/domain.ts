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

import { DomainRange } from '@elastic/charts';

import { getAdjustedInterval } from '../../../charts/public';

import { getTimefilter } from '../services';
import { Aspect, DateHistogramParams, HistogramParams } from '../types';

export const getXDomain = (params: Aspect['params']): DomainRange => {
  const minInterval = (params as DateHistogramParams | HistogramParams)?.interval ?? undefined;

  if ((params as DateHistogramParams).date) {
    const bounds = getTimefilter().getBounds();

    if (bounds) {
      return {
        min: bounds.min?.valueOf(),
        max: bounds.max?.valueOf(),
        minInterval,
      };
    }
  }

  return {
    minInterval,
  };
};

export const getAdjustedDomain = (
  data: any[],
  { accessor, params }: Aspect,
  timeZone: string,
  domain?: DomainRange
): DomainRange => {
  const { interval, intervalESValue, intervalESUnit } = params as DateHistogramParams;

  if (accessor && domain && 'min' in domain && 'max' in domain) {
    const xValues = data.map((d) => d[accessor]).sort();

    const [firstXValue] = xValues;
    const lastXValue = xValues[xValues.length - 1];

    const domainMin = Math.min(firstXValue, domain.min);
    const domainMax = Math.max(domain.max - interval, lastXValue);
    const minInterval = getAdjustedInterval(xValues, intervalESValue, intervalESUnit, timeZone);

    return {
      min: domainMin,
      max: domainMax,
      minInterval,
    };
  }

  return {
    minInterval: interval,
  };
};
