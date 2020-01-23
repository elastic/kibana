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
import { shallow } from 'enzyme';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

import { InputControlVis } from './input_control_vis';
import { ListControl } from '../../control/list_control_factory';
import { RangeControl } from '../../control/range_control_factory';

jest.mock('ui/new_platform');

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
  expect(component).toMatchSnapshot(); // eslint-disable-line
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
  expect(component).toMatchSnapshot(); // eslint-disable-line
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
  expect(component).toMatchSnapshot(); // eslint-disable-line
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
  expect(component).toMatchSnapshot(); // eslint-disable-line
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
