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
    refreshControl={() => {}}
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
    refreshControl={() => {}}
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
    refreshControl={() => {}}
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
    refreshControl={() => {}}
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
    refreshControl={() => {}}
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
    refreshControl={() => {}}
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
    refreshControl={() => {}}
  />);
  findTestSubject(component, 'inputControlCancelBtn').simulate('click');
  sinon.assert.calledOnce(resetControls);
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(stageFilter);
});
