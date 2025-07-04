/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
