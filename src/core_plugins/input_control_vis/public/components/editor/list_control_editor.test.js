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
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getIndexPatternMock } from './__tests__/get_index_pattern_mock';
import { getIndexPatternsMock } from './__tests__/get_index_patterns_mock';

import {
  ListControlEditor,
} from './list_control_editor';

const controlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'keywordField',
  label: 'custom label',
  type: 'list',
  options: {
    type: 'terms',
    multiselect: true,
    size: 10
  }
};
let handleFieldNameChange;
let handleIndexPatternChange;
let handleCheckboxOptionChange;
let handleNumberOptionChange;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleCheckboxOptionChange = sinon.spy();
  handleNumberOptionChange = sinon.spy();
});

test('renders ListControlEditor', () => {
  const component = shallow(<ListControlEditor
    getIndexPatterns={getIndexPatternsMock}
    getIndexPattern={getIndexPatternMock}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={[]}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('parentCandidates', () => {
  const parentCandidates = [
    { value: '1', text: 'fieldA' },
    { value: '2', text: 'fieldB' }
  ];
  const component = shallow(<ListControlEditor
    getIndexPatterns={getIndexPatternsMock}
    getIndexPattern={getIndexPatternMock}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={parentCandidates}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleCheckboxOptionChange - multiselect', () => {
  const component = mount(<ListControlEditor
    getIndexPatterns={getIndexPatternsMock}
    getIndexPattern={getIndexPatternMock}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={[]}
  />);
  const checkbox = findTestSubject(component, 'listControlMultiselectInput');
  checkbox.simulate('change', { target: { checked: true } });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  sinon.assert.notCalled(handleNumberOptionChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'multiselect';
  sinon.assert.calledWith(
    handleCheckboxOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match((evt) => {
      if (evt.target.checked === true) {
        return true;
      }
      return false;
    }, 'unexpected checkbox input event'));
});

test('handleNumberOptionChange - size', () => {
  const component = mount(<ListControlEditor
    getIndexPatterns={getIndexPatternsMock}
    getIndexPattern={getIndexPatternMock}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={[]}
  />);
  const input = findTestSubject(component, 'listControlSizeInput');
  input.simulate('change', { target: { value: 7 } });
  sinon.assert.notCalled(handleCheckboxOptionChange);
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'size';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match((evt) => {
      if (evt.target.value === 7) {
        return true;
      }
      return false;
    }, 'unexpected input event'));
});
