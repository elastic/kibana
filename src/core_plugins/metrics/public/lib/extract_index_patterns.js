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

import { uniq } from 'lodash';
export function extractIndexPatterns(vis) {
  const patternsToFetch = [];

  if (!vis.fields[vis.params.index_pattern]) {
    patternsToFetch.push(vis.params.index_pattern);
  }

  vis.params.series.forEach(series => {
    const indexPattern = series.series_index_pattern;
    if (series.override_index_pattern && !vis.fields[indexPattern]) {
      patternsToFetch.push(indexPattern);
    }
  });

  if (vis.params.annotations) {
    vis.params.annotations.forEach(item => {
      const indexPattern = item.index_pattern;
      if (indexPattern && !vis.fields[indexPattern]) {
        patternsToFetch.push(indexPattern);
      }
    });
  }

  return uniq(patternsToFetch);

}
