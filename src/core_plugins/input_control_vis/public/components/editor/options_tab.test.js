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

import {
  OptionsTab,
} from './options_tab';

const scopeMock = {
  editorState: {
    params: {
      updateFiltersOnChange: false,
      useTimeFilter: false
    }
  }
};
let stageEditorParams;

beforeEach(() => {
  stageEditorParams = sinon.spy();
});

test('renders OptionsTab', () => {
  const component = shallow(<OptionsTab
    scope={scopeMock}
    editorState={scopeMock.editorState}
    stageEditorParams={stageEditorParams}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('updateFiltersOnChange', () => {
  const component = mountWithIntl(<OptionsTab
    scope={scopeMock}
    editorState={scopeMock.editorState}
    stageEditorParams={stageEditorParams}
  />);
  const checkbox = component.find('[data-test-subj="inputControlEditorUpdateFiltersOnChangeCheckbox"] input[type="checkbox"]');
  checkbox.simulate('change', { target: { checked: true } });
  const expectedParams = {
    updateFiltersOnChange: true
  };
  sinon.assert.calledOnce(stageEditorParams);
  sinon.assert.calledWith(stageEditorParams, sinon.match(expectedParams));
});

test('useTimeFilter', () => {
  const component = mountWithIntl(<OptionsTab
    scope={scopeMock}
    editorState={scopeMock.editorState}
    stageEditorParams={stageEditorParams}
  />);
  const checkbox = component.find('[data-test-subj="inputControlEditorUseTimeFilterCheckbox"] input[type="checkbox"]');
  checkbox.simulate('change', { target: { checked: true } });
  const expectedParams = {
    useTimeFilter: true
  };
  sinon.assert.calledOnce(stageEditorParams);
  sinon.assert.calledWith(stageEditorParams, sinon.match(expectedParams));
});

test('pinFilters', () => {
  const component = mountWithIntl(<OptionsTab
    scope={scopeMock}
    editorState={scopeMock.editorState}
    stageEditorParams={stageEditorParams}
  />);
  const checkbox = component.find('[data-test-subj="inputControlEditorPinFiltersCheckbox"] input[type="checkbox"]');
  checkbox.simulate('change', { target: { checked: true } });
  const expectedParams = {
    pinFilters: true
  };
  sinon.assert.calledOnce(stageEditorParams);
  sinon.assert.calledWith(stageEditorParams, sinon.match(expectedParams));
});
