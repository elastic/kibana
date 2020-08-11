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

import { partial } from 'lodash';
import { getPoint } from './_get_point';
import { addToSiri, Serie } from './_add_to_siri';
import { Chart } from './point_series';
import { Table } from '../../types';

export function getSeries(table: Table, chart: Chart) {
  const aspects = chart.aspects;
  const xAspect = aspects.x[0];
  const yAspect = aspects.y[0];
  const zAspect = aspects.z && aspects.z[0];
  const multiY = Array.isArray(aspects.y) && aspects.y.length > 1;

  const partGetPoint = partial(getPoint, table, xAspect, aspects.series);

  const seriesMap = new Map<string, Serie>();

  table.rows.forEach((row, rowIndex) => {
    if (!multiY) {
      const point = partGetPoint(row, rowIndex, yAspect, zAspect);
      if (point) {
        const id = `${point.series}-${yAspect.accessor}`;
        point.seriesId = id;
        addToSiri(
          seriesMap,
          point,
          id,
          point.series,
          yAspect.format,
          zAspect && zAspect.format,
          zAspect && zAspect.title
        );
      }
      return;
    }

    aspects.y.forEach(function (y) {
      const point = partGetPoint(row, rowIndex, y, zAspect);
      if (!point) {
        return;
      }

      // use the point's y-axis as it's series by default,
      // but augment that with series aspect if it's actually
      // available
      let seriesId = y.accessor;
      let seriesLabel = y.title;

      if (aspects.series) {
        const prefix = point.series ? point.series + ': ' : '';
        seriesId = prefix + seriesId;
        seriesLabel = prefix + seriesLabel;
      }

      (point.seriesId as string | number) = seriesId;
      addToSiri(
        seriesMap,
        point,
        seriesId as string,
        seriesLabel,
        y.format,
        zAspect && zAspect.format,
        zAspect && zAspect.title
      );
    });
  });

  return [...seriesMap.values()];
}
