/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
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
