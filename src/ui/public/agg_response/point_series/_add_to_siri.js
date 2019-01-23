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
import { findLastIndex } from 'lodash';

function instantiateZeroFilledArray({ xKeys, series }) {
  // borrowed from `ui/public/vislib/components/zero_injection/zero_filled_array`
  return xKeys.map(x => ({
    x,
    xi: Infinity,
    y: 0,
    series,
  }));
}

export function addToSiri(xKeys, series, point, id, label, agg) {
  id = id == null ? '' : id + '';

  if (!series.has(id)) {
    series.set(id, {
      label: label == null ? id : label,
      aggLabel: agg.type ? agg.type.makeLabel(agg) : label,
      aggId: agg.parentId ? agg.parentId : agg.id,
      count: 0,
      values: instantiateZeroFilledArray({ xKeys, series: label }),
    });
  }

  const seriesValues = series.get(id).values;
  const lastXIndex = findLastIndex(seriesValues, v => v.x === point.x);
  if (seriesValues[lastXIndex].xi) {
    // update the ordered, zero-filled array with the "real" value
    seriesValues[lastXIndex] = point;
  } else {
    // add the point to the list of values at the correct position
    seriesValues.splice(lastXIndex + 1, 0, point);
  }
}
