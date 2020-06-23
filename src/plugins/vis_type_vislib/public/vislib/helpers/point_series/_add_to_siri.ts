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

import { Point } from './_get_point';
import { Dimension } from './point_series';

export interface Serie {
  id: string;
  rawId: string;
  label: string;
  count: number;
  values: Point[];
  format: Dimension['format'];
  zLabel?: string;
  zFormat?: Dimension['format'];
}

export function addToSiri(
  series: Map<string, Serie>,
  point: Point,
  id: string,
  yLabel: string | undefined | null,
  yFormat: Dimension['format'],
  zFormat?: Dimension['format'],
  zLabel?: string
) {
  id = id == null ? '' : id + '';

  if (series.has(id)) {
    (series.get(id) as Serie).values.push(point);
    return;
  }

  series.set(id, {
    id: id.split('-').pop() as string,
    rawId: id,
    label: yLabel == null ? id : yLabel,
    count: 0,
    values: [point],
    format: yFormat,
    zLabel,
    zFormat,
  });
}
