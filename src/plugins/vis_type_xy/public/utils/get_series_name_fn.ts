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

import { memoize } from 'lodash';

import { XYChartSeriesIdentifier, SeriesName } from '@elastic/charts';

import { VisConfig } from '../types';

function getSplitValues(
  splitAccessors: XYChartSeriesIdentifier['splitAccessors'],
  seriesAspects?: VisConfig['aspects']['series']
) {
  if (splitAccessors.size < 1) {
    return [];
  }

  const splitValues: Array<string | number> = [];
  splitAccessors.forEach((value, key) => {
    const split = (seriesAspects ?? []).find(({ accessor }) => accessor === key);
    splitValues.push(split?.formatter ? split?.formatter(value) : value);
  });
  return splitValues;
}

export const getSeriesNameFn = (aspects: VisConfig['aspects'], multipleY = false) =>
  memoize(
    ({ splitAccessors, yAccessor }: XYChartSeriesIdentifier): SeriesName => {
      const splitValues = getSplitValues(splitAccessors, aspects.series);
      const yAccessorTitle =
        aspects.y.find(({ accessor }) => accessor === yAccessor)?.title ?? null;

      if (!yAccessorTitle) {
        return null;
      }

      if (multipleY) {
        if (splitValues.length === 0) {
          return yAccessorTitle;
        }
        return `${splitValues.join(' - ')}: ${yAccessorTitle}`;
      }

      return splitValues.length > 0 ? splitValues.join(' - ') : yAccessorTitle;
    }
  );
