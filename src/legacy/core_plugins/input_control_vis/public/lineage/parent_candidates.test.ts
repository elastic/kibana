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
import { getParentCandidates } from './parent_candidates';
import { CONTROL_TYPES, newControl } from '../editor_utils';

function createControlParams(id: any) {
  const controlParams = newControl(CONTROL_TYPES.LIST);
  controlParams.id = id;
  controlParams.indexPattern = 'indexPatternId';
  controlParams.fieldName = 'fieldName';
  return controlParams;
}

test('creates parent candidates that avoid circular graphs', () => {
  const control1 = createControlParams(1);
  const control2 = createControlParams(2);
  const control3 = createControlParams(3);
  control2.parent = control1.id;
  control3.parent = control2.id;

  const controlParamsList = [control1, control2, control3];
  const lineageMap = getLineageMap(controlParamsList);

  const parentCandidatesForControl1 = getParentCandidates(
    controlParamsList,
    control1.id,
    lineageMap
  );
  expect([]).to.eql(parentCandidatesForControl1);

  const parentCandidatesForControl2 = getParentCandidates(
    controlParamsList,
    control2.id,
    lineageMap
  );
  expect([{ value: 1, text: 'fieldName' }]).to.eql(parentCandidatesForControl2);

  const parentCandidatesForControl3 = getParentCandidates(
    controlParamsList,
    control3.id,
    lineageMap
  );
  expect([
    { value: 1, text: 'fieldName' },
    { value: 2, text: 'fieldName' },
  ]).to.eql(parentCandidatesForControl3);
});
