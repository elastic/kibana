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
  value: '',
  getMultiSelectDelimiter: () => { return ','; },
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

test('stageFilter list control', () => {
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
  const reactSelectInput = component.find(`#${mockListControl.id}`).hostNodes();
  reactSelectInput.simulate('change', { target: { value: 'choice1' } });
  reactSelectInput.simulate('keyDown', { keyCode: 9, key: 'Tab' });
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(resetControls);
  const expectedControlIndex = 0;
  const expectedControlValue = 'choice1';
  sinon.assert.calledWith(stageFilter,
    expectedControlIndex,
    expectedControlValue
  );
});
