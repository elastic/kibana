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
import { TickFormatter } from '@elastic/charts';
import { DatatableRow } from '../../../expressions/public';
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
