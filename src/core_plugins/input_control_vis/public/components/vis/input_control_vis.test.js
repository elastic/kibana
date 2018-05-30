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

import {
  InputControlVis,
} from './input_control_vis';

const mockListControl = {
  id: 'mock-list-control',
  isEnabled: () => { return true; },
  options: {
    type: 'terms',
    multiselect: true
  },
  type: 'list',
  label: 'list control',
  value: [],
  selectOptions: [
    { label: 'choice1', value: 'choice1' },
    { label: 'choice2', value: 'choice2' }
  ]
};
const mockRangeControl = {
  id: 'mock-range-control',
  isEnabled: () => { return true; },
  options: {
    decimalPlaces: 0,
    step: 1
  },
  type: 'range',
  label: 'ragne control',
  value: { min: 0, max: 0 },
  min: 0,
  max: 100
};
const updateFiltersOnChange = false;

let stageFilter;
let submitFilters;
let resetControls;
let clearControls;

beforeEach(() => {
  stageFilter = sinon.spy();
  submitFilters = sinon.spy();
  resetControls = sinon.spy();
  clearControls = sinon.spy();
});

test('Renders list control', () => {
  const component = shallow(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockListControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return false; }}
    hasValues={() => { return false; }}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('Renders range control', () => {
  const component = shallow(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockRangeControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return false; }}
    hasValues={() => { return false; }}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('Apply and Cancel change btns enabled when there are changes', () => {
  const component = shallow(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockListControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return true; }}
    hasValues={() => { return false; }}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('Clear btns enabled when there are values', () => {
  const component = shallow(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockListControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return false; }}
    hasValues={() => { return true; }}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('clearControls', () => {
  const component = mount(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockListControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return true; }}
    hasValues={() => { return true; }}
  />);
  findTestSubject(component, 'inputControlClearBtn').simulate('click');
  sinon.assert.calledOnce(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(resetControls);
  sinon.assert.notCalled(stageFilter);
});

test('submitFilters', () => {
  const component = mount(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockListControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return true; }}
    hasValues={() => { return true; }}
  />);
  findTestSubject(component, 'inputControlSubmitBtn').simulate('click');
  sinon.assert.calledOnce(submitFilters);
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(resetControls);
  sinon.assert.notCalled(stageFilter);
});

test('resetControls', () => {
  const component = mount(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[mockListControl]}
    updateFiltersOnChange={updateFiltersOnChange}
    hasChanges={() => { return true; }}
    hasValues={() => { return true; }}
  />);
  findTestSubject(component, 'inputControlCancelBtn').simulate('click');
  sinon.assert.calledOnce(resetControls);
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(stageFilter);
});
