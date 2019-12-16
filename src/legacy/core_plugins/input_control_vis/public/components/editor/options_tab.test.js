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
import { shallow } from 'enzyme';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { OptionsTab } from './options_tab';

describe('OptionsTab', () => {
  let props;

  beforeEach(() => {
    props = {
      vis: {},
      stateParams: {
        updateFiltersOnChange: false,
        useTimeFilter: false,
      },
      setValue: jest.fn(),
    };
  });

  it('should renders OptionsTab', () => {
    const component = shallow(<OptionsTab {...props} />);

    expect(component).toMatchSnapshot();
  });

  it('should update updateFiltersOnChange', () => {
    const component = mountWithIntl(<OptionsTab {...props} />);
    const checkbox = component.find(
      '[data-test-subj="inputControlEditorUpdateFiltersOnChangeCheckbox"] button'
    );
    checkbox.simulate('click');

    expect(props.setValue).toHaveBeenCalledTimes(1);
    expect(props.setValue).toHaveBeenCalledWith('updateFiltersOnChange', true);
  });

  it('should update useTimeFilter', () => {
    const component = mountWithIntl(<OptionsTab {...props} />);
    const checkbox = component.find(
      '[data-test-subj="inputControlEditorUseTimeFilterCheckbox"] button'
    );
    checkbox.simulate('click');

    expect(props.setValue).toHaveBeenCalledTimes(1);
    expect(props.setValue).toHaveBeenCalledWith('useTimeFilter', true);
  });

  it('should update pinFilters', () => {
    const component = mountWithIntl(<OptionsTab {...props} />);
    const checkbox = component.find(
      '[data-test-subj="inputControlEditorPinFiltersCheckbox"] button'
    );
    checkbox.simulate('click');

    expect(props.setValue).toHaveBeenCalledTimes(1);
    expect(props.setValue).toHaveBeenCalledWith('pinFilters', true);
  });
});
