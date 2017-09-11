import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';

import {
  InputControlVis,
} from './vis';

const filterManagerMock = {
  createFilter: (controlValue) => {
    return `simulated kibana filter, input value:${controlValue}`;
  }
};
const mockListControl = {
  id: 'mock-list-control',
  options: {
    type: 'terms',
    multiselect: true
  },
  type: 'list',
  label: 'list control',
  filterManager: filterManagerMock,
  value: '',
  selectOptions: [
    { label: 'choice1', value: 'choice1' },
    { label: 'choice2', value: 'choice2' }
  ]
};
const mockRangeControl = {
  id: 'mock-range-control',
  options: {
    decimalPlaces: 0,
    step: 1
  },
  type: 'range',
  label: 'ragne control',
  filterManager: filterManagerMock,
  value: { min: 0, max: 0 },
  min: 0,
  max: 100
};
const getStagedControlsNothingStaged  = () => { return []; };
const getStagedControlsWithStaged  = () => { return [{ }]; };
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
    getStagedControls={getStagedControlsWithStaged}
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
    getStagedControls={getStagedControlsWithStaged}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('Submit and Reset btns disabled when nothing is staged', () => {
  const component = shallow(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[]}
    updateFiltersOnChange={updateFiltersOnChange}
    getStagedControls={getStagedControlsNothingStaged}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('Submit and Reset btns enabled when filter is staged', () => {
  const component = shallow(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[]}
    updateFiltersOnChange={updateFiltersOnChange}
    getStagedControls={getStagedControlsWithStaged}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('clearControls', () => {
  const component = mount(<InputControlVis
    stageFilter={stageFilter}
    submitFilters={submitFilters}
    resetControls={resetControls}
    clearControls={clearControls}
    controls={[]}
    updateFiltersOnChange={updateFiltersOnChange}
    getStagedControls={getStagedControlsNothingStaged}
  />);
  component.find('[data-test-subj="inputControlClearBtn"]').simulate('click');
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
    controls={[]}
    updateFiltersOnChange={updateFiltersOnChange}
    getStagedControls={getStagedControlsWithStaged}
  />);
  component.find('[data-test-subj="inputControlSubmitBtn"]').simulate('click');
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
    controls={[]}
    updateFiltersOnChange={updateFiltersOnChange}
    getStagedControls={getStagedControlsWithStaged}
  />);
  component.find('[data-test-subj="inputControlCancelBtn"]').simulate('click');
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
    getStagedControls={getStagedControlsWithStaged}
  />);
  const reactSelectInput = component.find(`#${mockListControl.id}`);
  reactSelectInput.simulate('change', { target: { value: 'choice1' } });
  reactSelectInput.simulate('keyDown', { keyCode: 9, key: 'Tab' });
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(resetControls);
  const expectedControlIndex = 0;
  const expectedControlValue = 'choice1';
  const expectedKbnFilter = 'simulated kibana filter, input value:choice1';
  sinon.assert.calledWith(stageFilter,
    expectedControlIndex,
    expectedControlValue,
    expectedKbnFilter
  );
});
