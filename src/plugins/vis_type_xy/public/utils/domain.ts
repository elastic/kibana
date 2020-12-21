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

import { uniq } from 'lodash';
import { unitOfTime } from 'moment';

import { DomainRange } from '@elastic/charts';

import { getAdjustedInterval } from '../../../charts/public';
import { Datatable } from '../../../expressions/public';

import { getTimefilter } from '../services';
import { Aspect, DateHistogramParams, HistogramParams } from '../types';

export const getXDomain = (params: Aspect['params']): DomainRange => {
  const minInterval = (params as DateHistogramParams | HistogramParams)?.interval ?? undefined;

  if ((params as DateHistogramParams).date) {
    const bounds = getTimefilter().getBounds();

    if (bounds) {
      return {
        min: bounds.min ? bounds.min.valueOf() : undefined,
        max: bounds.max ? bounds.max.valueOf() : undefined,
        minInterval,
      };
    }
  }

  return {
    minInterval,
  };
};

export const getAdjustedDomain = (
  data: Datatable['rows'],
  { accessor, params }: Aspect,
  timeZone: string,
  domain?: DomainRange,
  hasBars?: boolean
): DomainRange => {
  if (
    accessor &&
    domain &&
    'min' in domain &&
    'max' in domain &&
    'intervalESValue' in params &&
    'intervalESUnit' in params
  ) {
    const { interval, intervalESValue, intervalESUnit } = params;
    const xValues = uniq(data.map((d) => d[accessor]).sort());

    const [firstXValue] = xValues;
    const lastXValue = xValues[xValues.length - 1];

    const domainMin = Math.min(firstXValue, domain.min);
    const domainMaxValue = hasBars ? domain.max - interval : lastXValue + interval;
    const domainMax = Math.max(domainMaxValue, lastXValue);
    const minInterval = getAdjustedInterval(
      xValues,
      intervalESValue,
      intervalESUnit as unitOfTime.Base,
      timeZone
    );

    return {
      min: domainMin,
      max: domainMax,
      minInterval,
    };
  }

  return 'interval' in params
    ? {
        minInterval: params.interval,
      }
    : {};
};
