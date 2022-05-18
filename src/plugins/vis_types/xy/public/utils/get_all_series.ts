/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TickFormatter } from '@elastic/charts';
import { DatatableRow } from '@kbn/expressions-plugin/public';
import { Column, Aspect } from '../types';

interface SplitAccessors {
  accessor: Column['id'];
  formatter?: TickFormatter;
}

export const getAllSeries = (
  rows: DatatableRow[],
  splitAccessors: SplitAccessors[] | undefined,
  yAspects: Aspect[]
) => {
  const allSeries: string[] = [];
  if (!splitAccessors) return [];

  rows.forEach((row) => {
    let seriesName = '';
    splitAccessors?.forEach(({ accessor, formatter }) => {
      if (!accessor) return;
      const name = formatter ? formatter(row[accessor]) : row[accessor];
      if (seriesName) {
        seriesName += ` - ${name}`;
      } else {
        seriesName = name;
      }
    });

    // multiple y axis
    if (yAspects.length > 1) {
      yAspects.forEach((aspect) => {
        if (!allSeries.includes(`${seriesName}: ${aspect.title}`)) {
          allSeries.push(`${seriesName}: ${aspect.title}`);
        }
      });
    } else {
      if (!allSeries.includes(seriesName)) {
        allSeries.push(seriesName);
      }
    }
  });
  return allSeries;
};
