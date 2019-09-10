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

import uuid from 'uuid';
import _ from 'lodash';

export const reIdSeries = source => {
  const series = _.cloneDeep(source);
  series.id = uuid.v1();
  series.metrics.forEach(metric => {
    const id = uuid.v1();
    const metricId = metric.id;
    metric.id = id;
    if (series.terms_order_by === metricId) series.terms_order_by = id;
    series.metrics.filter(r => r.field === metricId).forEach(r => (r.field = id));
    series.metrics
      .filter(r => r.type === 'calculation' && r.variables.some(v => v.field === metricId))
      .forEach(r => {
        r.variables
          .filter(v => v.field === metricId)
          .forEach(v => {
            v.id = uuid.v1();
            v.field = id;
          });
      });
  });
  return series;
};
