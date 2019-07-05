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
import { HierarchicalTooltipFormatterProvider } from './_hierarchical_tooltip_formatter';

export function BuildHierarchicalDataProvider(Private) {
  const tooltipFormatter = Private(HierarchicalTooltipFormatterProvider);

  return function (table) {
    let slices;
    const names = {};
    if (table.columns.length === 1) {
      slices = [{ name: table.columns[0].title, size: table.rows[0][0].value }];
      names[table.columns[0].title] = table.columns[0].title;
    } else {
      let parent;
      slices = [];
      table.rows.forEach(row => {
        let dataLevel = slices;
        // we always have one bucket column and one metric column (for every level)
        for (let columnIndex = 0; columnIndex < table.columns.length; columnIndex += 2) {
          const { aggConfig } = table.columns[columnIndex];
          const fieldFormatter = aggConfig.fieldFormatter('text');
          const bucketColumn = row[columnIndex];
          const metricColumn = row[columnIndex + 1];
          const name = fieldFormatter(bucketColumn.value);
          const size = metricColumn.value;
          names[name] = name;

          let slice  = dataLevel.find(slice => slice.name === name);
          if (!slice) {
            slice = { name, size, parent, aggConfig, aggConfigResult: bucketColumn, children: [] };
            dataLevel.push(slice);
          }
          parent = slice;
          dataLevel = slice.children;
        }
      });
    }

    return {
      hits: table.rows.length,
      raw: table,
      names: toArray(names),
      tooltipFormatter: tooltipFormatter(table.columns),
      slices: {
        children: [
          ...slices
        ]
      }
    };
  };
}
