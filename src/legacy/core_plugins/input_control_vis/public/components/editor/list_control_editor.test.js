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
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getIndexPatternMock } from './__tests__/get_index_pattern_mock';

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
    dynamicOptions: false,
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

describe('renders', () => {
  test('should not display any options until field is selected', async () => {
    const controlParams = {
      id: '1',
      indexPattern: 'mockIndexPattern',
      fieldName: '',
      type: 'list',
      options: {
        type: 'terms',
        multiselect: true,
        dynamicOptions: true,
        size: 5,
      }
    };
    const component = shallow(<ListControlEditor
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

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should display chaining input when parents are provided', async () => {
    const parentCandidates = [
      { value: '1', text: 'fieldA' },
      { value: '2', text: 'fieldB' }
    ];
    const component = shallow(<ListControlEditor
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

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  describe('dynamic options', () => {
    test('should display dynamic options for string fields', async () => {
      const controlParams = {
        id: '1',
        indexPattern: 'mockIndexPattern',
        fieldName: 'keywordField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: true,
          size: 5,
        }
      };
      const component = shallow(<ListControlEditor
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

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('should display size field when dynamic options is disabled', async () => {
      const controlParams = {
        id: '1',
        indexPattern: 'mockIndexPattern',
        fieldName: 'keywordField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: false,
          size: 5,
        }
      };
      const component = shallow(<ListControlEditor
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

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('should display disabled dynamic options with tooltip for non-string fields', async () => {
      const controlParams = {
        id: '1',
        indexPattern: 'mockIndexPattern',
        fieldName: 'numberField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: true,
          size: 5,
        }
      };
      const component = shallow(<ListControlEditor
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

      // Ensure all promises resolve
      await new Promise(resolve => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });
  });
});

test('handleCheckboxOptionChange - multiselect', async () => {
  const component = mountWithIntl(<ListControlEditor
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

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

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

test('handleNumberOptionChange - size', async () => {
  const component = mountWithIntl(<ListControlEditor
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

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

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

test('field name change', async () => {
  const component = shallowWithIntl(
    <ListControlEditor
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParams}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleCheckboxOptionChange={handleCheckboxOptionChange}
      handleNumberOptionChange={handleNumberOptionChange}
      handleParentChange={() => {}}
      parentCandidates={[]}
    />
  );

  const update = async () => {
    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
  };

  // ensure that after async loading is complete the DynamicOptionsSwitch is not disabled
  expect(component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')).toHaveLength(0);
  await update();
  expect(component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')).toHaveLength(1);

  component.setProps({
    controlParams: {
      ...controlParams,
      fieldName: 'numberField',
    },
  });

  // ensure that after async loading is complete the DynamicOptionsSwitch is disabled, because this is not a "string" field
  expect(component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=true]')).toHaveLength(0);
  await update();


  /*
  The issue with enzyme@3.9.0 -> the fix has not been released yet -> https://github.com/airbnb/enzyme/pull/2027
  TODO: Enable the expectation after the next patch released
  expect(component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=true]')).toHaveLength(1);
  */

  component.setProps({
    controlParams
  });

  // ensure that after async loading is complete the DynamicOptionsSwitch is not disabled again, because we switched to original "string" field
  expect(component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')).toHaveLength(0);
  await update();
  expect(component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')).toHaveLength(1);
});
