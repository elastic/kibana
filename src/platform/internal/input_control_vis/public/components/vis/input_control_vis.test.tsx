/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { InputControlVis } from './input_control_vis';
import { ListControl } from '../../control/list_control_factory';
import { RangeControl } from '../../control/range_control_factory';

const mockListControl: ListControl = {
  id: 'mock-list-control',
  isEnabled: () => {
    return true;
  },
  options: {
    type: 'terms',
    multiselect: true,
  },
  type: 'list',
  label: 'list control',
  value: [],
  selectOptions: ['choice1', 'choice2'],
  format: (value: any) => value,
} as ListControl;
const mockRangeControl: RangeControl = {
  id: 'mock-range-control',
  isEnabled: () => {
    return true;
  },
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  type: 'range',
  label: 'range control',
  value: { min: 0, max: 0 },
  min: 0,
  max: 100,
  format: (value: any) => value,
} as RangeControl;
const updateFiltersOnChange = false;

const refreshControlMock = () => Promise.resolve();

let stageFilter: sinon.SinonSpy;
let submitFilters: sinon.SinonSpy;
let resetControls: sinon.SinonSpy;
let clearControls: sinon.SinonSpy;

beforeEach(() => {
  stageFilter = sinon.spy();
  submitFilters = sinon.spy();
  resetControls = sinon.spy();
  clearControls = sinon.spy();
});

test('Renders list control', () => {
  const component = shallow(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockListControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return false;
      }}
      hasValues={() => {
        return false;
      }}
      refreshControl={refreshControlMock}
    />
  );
  expect(component).toMatchSnapshot();
});

test('Renders range control', () => {
  const component = shallow(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockRangeControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return false;
      }}
      hasValues={() => {
        return false;
      }}
      refreshControl={refreshControlMock}
    />
  );
  expect(component).toMatchSnapshot();
});

test('Apply and Cancel change btns enabled when there are changes', () => {
  const component = shallow(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockListControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return true;
      }}
      hasValues={() => {
        return false;
      }}
      refreshControl={refreshControlMock}
    />
  );
  expect(component).toMatchSnapshot();
});

test('Clear btns enabled when there are values', () => {
  const component = shallow(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockListControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return false;
      }}
      hasValues={() => {
        return true;
      }}
      refreshControl={refreshControlMock}
    />
  );
  expect(component).toMatchSnapshot();
});

test('clearControls', () => {
  const component = mountWithIntl(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockListControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return true;
      }}
      hasValues={() => {
        return true;
      }}
      refreshControl={refreshControlMock}
    />
  );
  findTestSubject(component, 'inputControlClearBtn').simulate('click');
  sinon.assert.calledOnce(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(resetControls);
  sinon.assert.notCalled(stageFilter);
});

test('submitFilters', () => {
  const component = mountWithIntl(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockListControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return true;
      }}
      hasValues={() => {
        return true;
      }}
      refreshControl={refreshControlMock}
    />
  );
  findTestSubject(component, 'inputControlSubmitBtn').simulate('click');
  sinon.assert.calledOnce(submitFilters);
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(resetControls);
  sinon.assert.notCalled(stageFilter);
});

test('resetControls', () => {
  const component = mountWithIntl(
    <InputControlVis
      stageFilter={stageFilter}
      submitFilters={submitFilters}
      resetControls={resetControls}
      clearControls={clearControls}
      controls={[mockListControl]}
      updateFiltersOnChange={updateFiltersOnChange}
      hasChanges={() => {
        return true;
      }}
      hasValues={() => {
        return true;
      }}
      refreshControl={refreshControlMock}
    />
  );
  findTestSubject(component, 'inputControlCancelBtn').simulate('click');
  sinon.assert.calledOnce(resetControls);
  sinon.assert.notCalled(clearControls);
  sinon.assert.notCalled(submitFilters);
  sinon.assert.notCalled(stageFilter);
});
