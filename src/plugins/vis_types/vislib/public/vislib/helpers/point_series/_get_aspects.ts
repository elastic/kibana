/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Dimensions } from '@kbn/vis-type-xy-plugin/public';

import { makeFakeXAspect } from './_fake_x_aspect';
import { Aspects } from './point_series';
import { Table } from '../../types';

/**
 * Identify and group the columns based on the aspect of the pointSeries
 * they represent.
 *
 * @return {object} - an object with a key for each aspect (see map). The values
 *                    may be undefined or an array of aspects.
 */
export function getAspects(table: Table, dimensions: Dimensions) {
  const aspects: Partial<Aspects> = {};
  (Object.keys(dimensions) as Array<keyof Dimensions>).forEach((name) => {
    const dimension = dimensions[name];
    const dimensionList = Array.isArray(dimension) ? dimension : [dimension];
    dimensionList.forEach((d) => {
      if (!d) {
        return;
      }
      const column = table.columns[d.accessor];
      if (!column) {
        return;
      }
      if (!aspects[name]) {
        aspects[name] = [];
      }
      aspects[name]!.push({
        accessor: column.id,
        column: d.accessor,
        title: column.name,
        format: d.format,
        params: d.params,
      });
    });
  });

  if (!aspects.x) {
    aspects.x = [makeFakeXAspect()];
  }

  return aspects as Aspects;
}
