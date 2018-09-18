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

import { AggType } from '../../agg_types/agg_type';

const allAgg = new AggType({
  name: 'all',
  title: 'All docs',
  ordered: false,
  hasNoDsl: true
});

export function makeFakeXAspect() {
  const fake = {
    makeLabel: () => 'all',
    fieldFormatter: () => '',
    type: allAgg
  };

  return {
    i: -1,
    aggConfig: fake,
    title: fake.makeLabel(),
  };
}
