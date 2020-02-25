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

import React from 'react';
import { shallow } from 'enzyme';
import { SinonSpy, spy, assert } from 'sinon';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

import { RangeControlEditor } from './range_control_editor';
import { ControlParams } from '../../editor_utils';
import { getDepsMock } from '../../test_utils/get_deps_mock';
import { getIndexPatternMock, updateComponent } from '../../test_utils';

const controlParams: ControlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'numberField',
  label: 'custom label',
  type: 'range',
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  parent: '',
};
const deps = getDepsMock();
let handleFieldNameChange: SinonSpy;
let handleIndexPatternChange: SinonSpy;
let handleOptionsChange: SinonSpy;

beforeEach(() => {
  handleFieldNameChange = spy();
  handleIndexPatternChange = spy();
  handleOptionsChange = spy();
});

test('renders RangeControlEditor', async () => {
  const component = shallow(
    <RangeControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
    />
  );

  await updateComponent(component);

  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleOptionsChange - step', async () => {
  const component = mountWithIntl(
    <RangeControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
    />
  );

  await updateComponent(component);

  findTestSubject(component, 'rangeControlSizeInput0').simulate('change', {
    target: { valueAsNumber: 0.5 },
  });
  assert.notCalled(handleFieldNameChange);
  assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'step';
  assert.calledWith(handleOptionsChange, expectedControlIndex, expectedOptionName, 0.5);
});

test('handleOptionsChange - decimalPlaces', async () => {
  const component = mountWithIntl(
    <RangeControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
    />
  );

  await updateComponent(component);

  findTestSubject(component, 'rangeControlDecimalPlacesInput0').simulate('change', {
    target: { valueAsNumber: 2 },
  });
  assert.notCalled(handleFieldNameChange);
  assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'decimalPlaces';
  assert.calledWith(handleOptionsChange, expectedControlIndex, expectedOptionName, 2);
});
