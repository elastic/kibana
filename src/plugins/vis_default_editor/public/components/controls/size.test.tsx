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
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EuiIconTip } from '@elastic/eui';
import { SizeParamEditor, SizeParamEditorProps } from './size';
import { aggParamCommonPropsMock } from './test_utils';

describe('SizeParamEditor', () => {
  let defaultProps: SizeParamEditorProps;

  beforeEach(() => {
    defaultProps = {
      ...aggParamCommonPropsMock,
      value: '',
      setValue: jest.fn(),
      setValidity: jest.fn(),
      setTouched: jest.fn(),
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallowWithIntl(<SizeParamEditor {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should render an iconTip in the label if it was passed', () => {
    const iconTip = <EuiIconTip position="right" content={'test'} type="questionInCircle" />;
    const comp = shallowWithIntl(<SizeParamEditor {...defaultProps} iconTip={iconTip} />);

    expect(comp.props().label.props.children[1]).toEqual(iconTip);
  });

  it('should change its validity due to passed props', () => {
    const comp = mountWithIntl(<SizeParamEditor {...defaultProps} />);

    expect(defaultProps.setValidity).toHaveBeenCalledWith(false);
    expect(comp.children().props()).toHaveProperty('isInvalid', false);

    comp.setProps({ disabled: true, showValidation: true });

    expect(defaultProps.setValidity).toHaveBeenCalledWith(true);
    expect(comp.children().props()).toHaveProperty('isInvalid', false);

    comp.setProps({ disabled: false, showValidation: true });

    expect(defaultProps.setValidity).toHaveBeenCalledWith(false);
    expect(comp.children().props()).toHaveProperty('isInvalid', true);

    comp.setProps({ value: 2, showValidation: true });

    expect(defaultProps.setValidity).toHaveBeenCalledWith(true);
    expect(comp.children().props()).toHaveProperty('isInvalid', false);
    expect(defaultProps.setValidity).toHaveBeenCalledTimes(4);
  });

  it('should set new parsed value', () => {
    const comp = mountWithIntl(<SizeParamEditor {...defaultProps} />);
    const input = comp.find('[type="number"]');
    input.simulate('change', { target: { value: '3' } });

    expect(defaultProps.setValue).toBeCalledWith(3);

    input.simulate('change', { target: { value: '' } });

    expect(defaultProps.setValue).toBeCalledWith('');
    expect(defaultProps.setValue).toHaveBeenCalledTimes(2);
  });

  it('should call setTouched on blur', () => {
    const comp = mountWithIntl(<SizeParamEditor {...defaultProps} />);
    comp.find('[type="number"]').simulate('blur');

    expect(defaultProps.setTouched).toHaveBeenCalledTimes(1);
  });
});
