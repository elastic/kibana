/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { Vis } from '../../../../visualizations/public';
import OptionsTab, { OptionsTabProps } from './options_tab';

describe('OptionsTab', () => {
  let props: OptionsTabProps;

  beforeEach(() => {
    props = {
      vis: {} as Vis,
      stateParams: {
        updateFiltersOnChange: false,
        useTimeFilter: false,
        pinFilters: false,
      },
      setValue: jest.fn(),
    } as unknown as OptionsTabProps;
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
