/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dimension } from '@kbn/vis-type-xy-plugin/public';

import { Point } from './_get_point';

const getAggId = (accessor: string) => (accessor ?? '').split('-').pop() ?? '';

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
    id: getAggId(id),
    rawId: id,
    label: yLabel == null ? id : yLabel,
    count: 0,
    values: [point],
    format: yFormat,
    zLabel,
    zFormat,
  });
}
