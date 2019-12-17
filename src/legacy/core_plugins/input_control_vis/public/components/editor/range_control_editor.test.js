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

jest.mock('ui/new_platform', () => ({
  npStart: {
    plugins: {
      data: {
        ui: {
          IndexPatternSelect: () => {
            return <div />;
          },
        },
      },
    },
  },
}));

import { findTestSubject } from '@elastic/eui/lib/test';
import { getIndexPatternMock } from './__tests__/get_index_pattern_mock';

import { RangeControlEditor } from './range_control_editor';

const controlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'numberField',
  label: 'custom label',
  type: 'range',
  options: {
    decimalPlaces: 0,
    step: 1,
  },
};
let handleFieldNameChange;
let handleIndexPatternChange;
let handleNumberOptionChange;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleNumberOptionChange = sinon.spy();
});

test('renders RangeControlEditor', () => {
  const component = shallow(
    <RangeControlEditor
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleNumberOptionChange={handleNumberOptionChange}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleNumberOptionChange - step', () => {
  const component = mountWithIntl(
    <RangeControlEditor
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleNumberOptionChange={handleNumberOptionChange}
    />
  );
  findTestSubject(component, 'rangeControlSizeInput0').simulate('change', {
    target: { value: 0.5 },
  });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'step';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match(evt => {
      if (evt.target.value === 0.5) {
        return true;
      }
      return false;
    }, 'unexpected input event')
  );
});

test('handleNumberOptionChange - decimalPlaces', () => {
  const component = mountWithIntl(
    <RangeControlEditor
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleNumberOptionChange={handleNumberOptionChange}
    />
  );
  findTestSubject(component, 'rangeControlDecimalPlacesInput0').simulate('change', {
    target: { value: 2 },
  });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'decimalPlaces';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match(evt => {
      if (evt.target.value === 2) {
        return true;
      }
      return false;
    }, 'unexpected input event')
  );
});
