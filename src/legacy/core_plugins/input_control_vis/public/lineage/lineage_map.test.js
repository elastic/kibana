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

import expect from '@kbn/expect';
import { getLineageMap } from './lineage_map';
import { CONTROL_TYPES, newControl } from '../editor_utils';

test('creates lineage map', () => {
  const control1 = newControl(CONTROL_TYPES.LIST);
  control1.id = 1;
  const control2 = newControl(CONTROL_TYPES.LIST);
  control2.id = 2;
  const control3 = newControl(CONTROL_TYPES.LIST);
  control3.id = 3;

  control2.parent = control1.id;
  control3.parent = control2.id;

  const lineageMap = getLineageMap([control1, control2, control3]);
  expect([control1.id]).to.eql(lineageMap.get(control1.id));
  expect([control2.id, control1.id]).to.eql(lineageMap.get(control2.id));
  expect([control3.id, control2.id, control1.id]).to.eql(lineageMap.get(control3.id));
});

test('safely handles circular graph', () => {
  const control1 = newControl(CONTROL_TYPES.LIST);
  control1.id = 1;
  const control2 = newControl(CONTROL_TYPES.LIST);
  control2.id = 2;

  control1.parent = control2.id;
  control2.parent = control1.id;

  const lineageMap = getLineageMap([control1, control2]);
  expect([control1.id, control2.id]).to.eql(lineageMap.get(control1.id));
  expect([control2.id, control1.id]).to.eql(lineageMap.get(control2.id));
});
