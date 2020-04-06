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

import { getPoint, Point } from './_get_point';
import { Chart, Table } from './point_series';

export function getSerie(table: Table, chart: Chart) {
  const aspects = chart.aspects;
  const yAspect = aspects.y[0];

  const point = getPoint(aspects.x[0].accessor, yAspect.accessor, table.rows[0]);
  if (point) {
    point.series = yAspect.title;
    const id = `${point.series}-${yAspect.accessor}`;
    point.seriesId = id;
  }
  return point || ({} as Point);
}
