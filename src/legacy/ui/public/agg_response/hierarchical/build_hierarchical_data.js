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

import { toArray } from 'lodash';
import { getFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';

export const buildHierarchicalData = (table, { metric, buckets = [] }) => {
  let slices;
  const names = {};
  const metricColumn = table.columns[metric.accessor];
  const metricFieldFormatter = metric.format;

  if (!buckets.length) {
    slices = [
      {
        name: metricColumn.name,
        size: table.rows[0][metricColumn.id],
      },
    ];
    names[metricColumn.name] = metricColumn.name;
  } else {
    slices = [];
    table.rows.forEach((row, rowIndex) => {
      let parent;
      let dataLevel = slices;

      buckets.forEach(bucket => {
        const bucketColumn = table.columns[bucket.accessor];
        const bucketValueColumn = table.columns[bucket.accessor + 1];
        const bucketFormatter = getFormat(bucket.format);
        const name = bucketFormatter.convert(row[bucketColumn.id]);
        const size = row[bucketValueColumn.id];
        names[name] = name;

        let slice = dataLevel.find(slice => slice.name === name);
        if (!slice) {
          slice = {
            name,
            size,
            parent,
            children: [],
            rawData: {
              table,
              row: rowIndex,
              column: bucket.accessor,
              value: row[bucketColumn.id],
            },
          };
          dataLevel.push(slice);
        }

        parent = slice;
        dataLevel = slice.children;
      });
    });
  }

  return {
    hits: table.rows.length,
    raw: table,
    names: toArray(names),
    tooltipFormatter: metricFieldFormatter,
    slices: {
      children: [...slices],
    },
  };
};
