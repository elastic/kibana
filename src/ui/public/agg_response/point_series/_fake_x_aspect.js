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

import { AggConfig } from '../../vis/agg_config';
import { AggType } from '../../agg_types/agg_type';

export function PointSeriesFakeXAxisProvider() {

  const allAgg = new AggType({
    name: 'all',
    title: 'All docs',
    ordered: false,
    hasNoDsl: true
  });

  return function makeFakeXAxis(vis) {
    const fake = new AggConfig(vis, {
      type: allAgg,
      schema: vis.type.schemas.all.byName.segment
    });

    return {
      i: -1,
      agg: fake,
      col: {
        aggConfig: fake,
        label: fake.makeLabel()
      }
    };
  };
}
