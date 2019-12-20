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

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { getDepsMock } from './__tests__/get_deps_mock';
import { getIndexPatternMock } from './__tests__/get_index_pattern_mock';
import { ListControlEditor } from './list_control_editor';
import { ControlParams } from '../../editor_utils';
import { updateComponent } from './__tests__/update_component';

const controlParamsBase: ControlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'keywordField',
  label: 'custom label',
  type: 'list',
  options: {
    type: 'terms',
    multiselect: true,
    dynamicOptions: false,
    size: 10,
  },
  parent: '',
};
const deps = getDepsMock();
let handleFieldNameChange: sinon.SinonSpy;
let handleIndexPatternChange: sinon.SinonSpy;
let handleCheckboxOptionChange: sinon.SinonSpy;
let handleNumberOptionChange: sinon.SinonSpy;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleOptionsChange = sinon.spy();
});

describe('renders', () => {
  test('should not display any options until field is selected', async () => {
    const controlParams: ControlParams = {
      id: '1',
      label: 'mock',
      indexPattern: 'mockIndexPattern',
      fieldName: '',
      type: 'list',
      options: {
        type: 'terms',
        multiselect: true,
        dynamicOptions: true,
        size: 5,
      },
      parent: '',
    };
    const component = shallow(
      <ListControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParams}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
        handleParentChange={() => {}}
        parentCandidates={[]}
      />
    );

    await updateComponent(component);

    expect(component).toMatchSnapshot();
  });

  test('should display chaining input when parents are provided', async () => {
    const parentCandidates = [
      { value: '1', text: 'fieldA' },
      { value: '2', text: 'fieldB' },
    ];
    const component = shallow(
      <ListControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParamsBase}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
        handleParentChange={() => {}}
        parentCandidates={parentCandidates}
      />
    );

    await updateComponent(component);

    expect(component).toMatchSnapshot();
  });

  describe('dynamic options', () => {
    test('should display dynamic options for string fields', async () => {
      const controlParams: ControlParams = {
        id: '1',
        label: 'mock',
        indexPattern: 'mockIndexPattern',
        fieldName: 'keywordField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: true,
          size: 5,
        },
        parent: '',
      };
      const component = shallow(
        <ListControlEditor
          deps={deps}
          getIndexPattern={getIndexPatternMock}
          controlIndex={0}
          controlParams={controlParams}
          handleFieldNameChange={handleFieldNameChange}
          handleIndexPatternChange={handleIndexPatternChange}
          handleOptionsChange={handleOptionsChange}
          handleParentChange={() => {}}
          parentCandidates={[]}
        />
      );

      await updateComponent(component);

      expect(component).toMatchSnapshot();
    });

    test('should display size field when dynamic options is disabled', async () => {
      const controlParams: ControlParams = {
        id: '1',
        label: 'mock',
        indexPattern: 'mockIndexPattern',
        fieldName: 'keywordField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: false,
          size: 5,
        },
        parent: '',
      };
      const component = shallow(
        <ListControlEditor
          deps={deps}
          getIndexPattern={getIndexPatternMock}
          controlIndex={0}
          controlParams={controlParams}
          handleFieldNameChange={handleFieldNameChange}
          handleIndexPatternChange={handleIndexPatternChange}
          handleOptionsChange={handleOptionsChange}
          handleParentChange={() => {}}
          parentCandidates={[]}
        />
      );

      await updateComponent(component);

      expect(component).toMatchSnapshot();
    });

    test('should display disabled dynamic options with tooltip for non-string fields', async () => {
      const controlParams: ControlParams = {
        id: '1',
        label: 'mock',
        indexPattern: 'mockIndexPattern',
        fieldName: 'numberField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: true,
          size: 5,
        },
        parent: '',
      };
      const component = shallow(
        <ListControlEditor
          deps={deps}
          getIndexPattern={getIndexPatternMock}
          controlIndex={0}
          controlParams={controlParams}
          handleFieldNameChange={handleFieldNameChange}
          handleIndexPatternChange={handleIndexPatternChange}
          handleOptionsChange={handleOptionsChange}
          handleParentChange={() => {}}
          parentCandidates={[]}
        />
      );

      await updateComponent(component);

      expect(component).toMatchSnapshot();
    });
  });
});

test('handleCheckboxOptionChange - multiselect', async () => {
  const component = mountWithIntl(
    <ListControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParamsBase}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
      handleParentChange={() => {}}
      parentCandidates={[]}
    />
  );

  await updateComponent(component);

  const checkbox = findTestSubject(component, 'listControlMultiselectInput');
  checkbox.simulate('click');
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'multiselect';
  sinon.assert.calledWith(
    handleCheckboxOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match(event => {
      // Synthetic `event.target.checked` does not get altered by EuiSwitch,
      // but its aria attribute is correctly updated
      if (event.target.getAttribute('aria-checked') === 'true') {
        return true;
      }
      return false;
    }, 'unexpected checkbox input event')
  );
});

test('handleNumberOptionChange - size', async () => {
  const component = mountWithIntl(
    <ListControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParamsBase}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
      handleParentChange={() => {}}
      parentCandidates={[]}
    />
  );

  await updateComponent(component);

  const input = findTestSubject(component, 'listControlSizeInput');
  input.simulate('change', { target: { value: 7 } });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'size';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match(event => {
      if (event.target.value === 7) {
        return true;
      }
      return false;
    }, 'unexpected input event')
  );
});

test('field name change', async () => {
  const component = shallowWithIntl(
    <ListControlEditor
      deps={deps}
      getIndexPattern={getIndexPatternMock}
      controlIndex={0}
      controlParams={controlParamsBase}
      handleFieldNameChange={handleFieldNameChange}
      handleIndexPatternChange={handleIndexPatternChange}
      handleOptionsChange={handleOptionsChange}
      handleParentChange={() => {}}
      parentCandidates={[]}
    />
  );

  // ensure that after async loading is complete the DynamicOptionsSwitch is not disabled
  expect(
    component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')
  ).toHaveLength(0);
  await updateComponent(component);
  expect(
    component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')
  ).toHaveLength(1);

  component.setProps({
    controlParams: {
      ...controlParamsBase,
      fieldName: 'numberField',
    },
  });

  // ensure that after async loading is complete the DynamicOptionsSwitch is disabled, because this is not a "string" field
  expect(
    component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=true]')
  ).toHaveLength(0);
  await updateComponent(component);
  expect(
    component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=true]')
  ).toHaveLength(1);

  component.setProps({
    controlParams: controlParamsBase,
  });

  // ensure that after async loading is complete the DynamicOptionsSwitch is not disabled again, because we switched to original "string" field
  expect(
    component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')
  ).toHaveLength(0);
  await updateComponent(component);
  expect(
    component.find('[data-test-subj="listControlDynamicOptionsSwitch"][disabled=false]')
  ).toHaveLength(1);
});
