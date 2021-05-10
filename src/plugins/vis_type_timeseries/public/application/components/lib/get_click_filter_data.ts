/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { XYChartSeriesIdentifier, GeometryValue } from '@elastic/charts';
import { ValueClickContext } from 'src/plugins/embeddable/public';
import { X_ACCESSOR_INDEX } from '../../visualizations/constants';
import { BUCKET_TYPES } from '../../../../common/enums';
import { TimeseriesVisParams } from '../../../types';
import type { TSVBTables } from './types';

export const getClickFilterData = (
  points: Array<[GeometryValue, XYChartSeriesIdentifier]>,
  tables: TSVBTables,
  model: TimeseriesVisParams
) => {
  const data: ValueClickContext['data']['data'] = [];
  points.forEach((point) => {
    const [geometry] = point;
    const { specId } = point[1];
    // specId for a split series has the format
    // 61ca57f1-469d-11e7-af02-69e470af7417:Men's Accessories, <layer_id>:<split_label>
    const termArray = specId.split(':');
    const table = tables[termArray[0]];

    const layer = model.series.filter(({ id }) => id === termArray[0]);
    let splitLabel = termArray.length > 1 ? termArray[1] : undefined;
    // compute label for filters split mode
    if (layer.length && layer[0].split_mode === BUCKET_TYPES.FILTERS) {
      const filter = layer[0]?.split_filters?.filter(({ id }) => id === termArray[1]);
      splitLabel = filter?.[0].filter?.query as string;
    }
    const index = table.rows.findIndex((row) => {
      const condition =
        geometry.x === row[X_ACCESSOR_INDEX] && geometry.y === row[X_ACCESSOR_INDEX + 1];
      return termArray.length > 1
        ? condition && row[X_ACCESSOR_INDEX + 2].toString() === splitLabel
        : condition;
    });
    if (index < 0) return;

    // Filter out the metric column
    const bucketCols = table.columns.filter((col) => col.meta.sourceParams?.schema === 'group');

    const newData = bucketCols.map(({ id }) => ({
      table,
      column: parseInt(id, 10),
      row: index,
      value: table.rows[index][id] ?? null,
    }));
    if (newData.length) {
      data.push(...newData);
    }
  });

  return data;
};
