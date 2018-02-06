import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';

import {
  OptionsTab,
} from './options_tab';

const scopeMock = {
  vis: {
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
    stageEditorParams={stageEditorParams}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('updateFiltersOnChange', () => {
  const component = mount(<OptionsTab
    scope={scopeMock}
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
  const component = mount(<OptionsTab
    scope={scopeMock}
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
  const component = mount(<OptionsTab
    scope={scopeMock}
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
