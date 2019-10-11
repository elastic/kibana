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

import { makeFakeXAspect } from './_fake_x_aspect';

/**
 * Identify and group the columns based on the aspect of the pointSeries
 * they represent.
 *
 * @param  {array} columns - the list of columns
 * @return {object} - an object with a key for each aspect (see map). The values
 *                    may be undefined, a single aspect, or an array of aspects.
 */
export function getAspects(table, dimensions) {
  const aspects = {};
  Object.keys(dimensions).forEach(name => {
    const dimension = Array.isArray(dimensions[name]) ? dimensions[name] : [dimensions[name]];
    dimension.forEach(d => {
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
      aspects[name].push({
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

  return aspects;
}
